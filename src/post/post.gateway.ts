
// post.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
@WebSocketGateway({ namespace: 'posts', cors: true })
export class PostGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) { }

  @SubscribeMessage('postViewed')
  async handlePostViewed(
    @MessageBody() data: { postId: string; userId: string },
    @ConnectedSocket() client: Socket
  ) {
    const { postId, userId } = data;
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user && !user.viewedPosts.includes(postId)) {
        user.viewedPosts = [...(user.viewedPosts || []), postId];
        await this.userRepository.save(user);
        console.log(`Post ${postId} marked as viewed for user ${userId}`);
      }
    } catch (error) {
      console.error('Error marking post as viewed:', error);
      client.emit('error', { message: 'Could not mark post as viewed' });
    }
  }
}
