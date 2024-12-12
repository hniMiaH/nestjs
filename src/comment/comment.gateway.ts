// CommentGateway.ts
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
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

  @SubscribeMessage('createComment')
  async handleCreateComment(
    client: Socket,
    payload: { postId: number; content: string; image: string; parentId: string; userId: string }
  ) {
    try {
      const { postId, content, image, parentId, userId } = payload;
      const createCommentDto: CreateCommentDto = { content, image, postId, parentId };

      if (!createCommentDto.content || !createCommentDto.postId) {
        throw new Error('Invalid comment data: content or postId is missing');
      }

      const newComment = await this.commentService.createComment(createCommentDto, userId);

      this.server.emit('commentCreated', newComment);

      const receiverSocketId = this.userSocketMap.get(newComment.post.created_by.id);

      if (newComment.post.created_by.id !== userId) {
        const notification = {
          type: 'comment',
          content: `${newComment.created_by.fullName} commented on your post.`,
          receiverId: newComment.post.created_by.id,
          created_at: newComment.createdAt,
          created_ago: newComment.created_ago
        };
        console.log(receiverSocketId);
        console.log(notification);
        this.server.to(receiverSocketId).emit('notification', notification);
      }

      if (parentId) {
        const parentComment = await this.commentRepository
          .createQueryBuilder('comment')
          .leftJoinAndSelect('comment.created_by', 'user')
          .where('comment.id = :id', { id: parentId })
          .getOne();

        if (parentComment && parentComment.created_by.id !== userId) {
          const replyNotification = {
            type: 'reply comment',
            content: `${newComment.created_by.fullName} replied to your comment.`,
            receiverId: parentComment.created_by.id,
            created_at: newComment.createdAt,
            created_ago: newComment.created_ago
          };
          const receiverSocketI = this.userSocketMap.get(parentComment.created_by.id);

          console.log(receiverSocketI)
          console.log(replyNotification)
          this.server.to(receiverSocketI).emit('notification', replyNotification);
        }
      }
    } catch (error) {
      console.error('Error handling createComment:', error.message);
      client.emit('error', { message: 'Failed to create comment' });
    }
  }
}