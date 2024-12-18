// CommentGateway.ts
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtService } from '@nestjs/jwt';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentEntity } from './entities/comment.entity';
import { Repository } from 'typeorm';
import * as moment from 'moment';

@WebSocketGateway({ namespace: 'comments', cors: true })
export class CommentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly commentService: CommentService,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
  ) { }
  private userSocketMap = new Map<string, string>();

  private async extractUserIdFromSocket(client: Socket): Promise<string> {
    const token = client.handshake.query.token as string;
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('SECRET')
      })
      return payload['id'];
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async handleConnection(client: Socket) {
    try {
      const userId = await this.extractUserIdFromSocket(client);
      this.userSocketMap.set(userId, client.id);
      console.log(userId)
    } catch (error) {
      console.log('Error extracting userId:', error);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.userSocketMap.entries())
      .find(([, socketId]) => socketId === client.id)?.[0];
    if (userId) {
      this.userSocketMap.delete(userId);
    }
  }

  @SubscribeMessage('joinPost')
  async handleJoinConversation(
    @MessageBody() data: { postId: number },
    @ConnectedSocket() client: Socket
  ) {
    const { postId } = data;

    if (!postId) {
      throw new Error('Invalid data: Missing conversationId');
    }

    client.join(postId.toString());
    console.log(`Client ${client.id} joined room ${postId}`);
  }

  @SubscribeMessage('leavePost')
  async handleLeaveConversation(
    @MessageBody() data: { postId: number },
    @ConnectedSocket() client: Socket
  ) {
    const { postId } = data;

    if (!postId) {
      throw new Error('Invalid data: Missing conversationId');
    }

    client.leave(postId.toString());
    console.log(`Client ${client.id} left room ${postId}`);
  }


  @SubscribeMessage('createComment')
  async handleCreateComment(
    client: Socket,
    payload: { postId: number; content: string; image: string; parentId: string; userId: string }
  ) {
    const { postId, content, image, parentId, userId } = payload;
    const createCommentDto: CreateCommentDto = { content, image, postId, parentId };

    if (!createCommentDto.content || !createCommentDto.postId) {
      throw new Error('Invalid comment data: content or postId is missing');
    }

    const newComment = await this.commentService.createComment(createCommentDto, userId);

    const { notify1, notify2, ...comment } = newComment;

    this.server.to(postId.toString()).emit('messageCreated', comment);

    if (notify1) {
      const receiverSocketId1 = this.userSocketMap.get(notify1.receiver.id);
      if (receiverSocketId1) {
        console.log('Notify1:', {
          id: notify1.id,
          content: notify1.content,
          post: notify1.postId,
          sender: notify1.sender,
          receiver: notify1.receiver,
        });
        this.server.to(receiverSocketId1).emit('notification', {
          id: notify1.id,
          content: notify1.content,
          post: notify1.postId,
          sender: notify1.sender,
          receiver: notify1.receiver,
        });
      }
    }

    if (notify2) {
      const receiverSocketId2 = this.userSocketMap.get(notify2.receiver.id);
      if (receiverSocketId2) {
        if (receiverSocketId2) {
          console.log('Notify2:', {
            id: notify2.id,
            content: notify2.content,
            sender: notify2.sender,
            receiver: notify2.receiver,
          });
          this.server.to(receiverSocketId2).emit('notification', {
            id: notify2.id,
            content: notify2.content,
            sender: notify2.sender,
            receiver: notify2.receiver,
          });
        }
      }
    }
  }
}
