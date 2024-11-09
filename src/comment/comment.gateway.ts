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
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: 'comments', cors: true })
export class CommentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly commentService: CommentService,
    private readonly jwtService: JwtService,
    private configService: ConfigService
  ) {

  }

  private async extractUserIdFromSocket(client: Socket): Promise<string> {
    const token = client.handshake.headers.authorization;
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
      console.log(`Client connected: ${client.id}, UserId: ${userId}`);
    } catch (error) {
      console.log('Error extracting userId:', error);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from comments: ${client.id}`);
  }

  @SubscribeMessage('createComment')
  async handleCreateComment(
    client: Socket,
    createCommentDto: CreateCommentDto
  ) {
    if (!createCommentDto) {
      throw new Error('Invalid data: createCommentDto is missing');
    }
    const userId = await this.extractUserIdFromSocket(client);
    if (!createCommentDto.content || !createCommentDto.postId) {
      throw new Error('Invalid comment data: content or postId is missing');
    }

    const newComment = await this.commentService.createComment(createCommentDto, userId);
    this.server.emit('commentCreated', newComment);
  }

}