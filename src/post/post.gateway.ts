import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { PostService } from './post.service';

@WebSocketGateway({ namespace: 'posts', cors: true })
export class PostGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly postService: PostService,
    private readonly jwtService: JwtService,
    private configService: ConfigService
  ) { }

  private async extractUserIdFromSocket(client: Socket): Promise<string> {
    const token = client.handshake.headers.authorization;
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('SECRET')
      });
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

  @SubscribeMessage('markPostAsSeen')
  async handleMarkPostAsSeen(client: Socket, data: any) {
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      const postIds = Array.isArray(parsedData.postIds) ? parsedData.postIds : [parsedData.postIds];

      const validPostIds = postIds.map(postId => {
        const postIdNumber = typeof postId === 'string' ? Number(postId) : postId;
        if (isNaN(postIdNumber)) {
          throw new Error(`postId ${postId} is invalid`);
        }
        return postIdNumber;
      });

      const userId = await this.extractUserIdFromSocket(client);

      const updatedUser = await this.postService.markPostAsSeen(userId, validPostIds);

      this.server.emit('postMarkedAsSeen', updatedUser);
    } catch (error) {
      console.log('Error marking post as seen:', error);
      client.emit('error', 'Error marking post as seen');
    }
  }


  @SubscribeMessage('getUnseenPosts')
  async handleGetUnseenPosts(
    client: Socket,
    data: { userId: string }
  ) {
    try {
      const unseenPosts = await this.postService.getUnseenPosts(data.userId);

      client.emit('unseenPosts', unseenPosts);
    } catch (error) {
      console.log('Error fetching unseen posts:', error);
      client.emit('error', 'Error fetching unseen posts');
    }
  }
}