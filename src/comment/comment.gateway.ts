// CommentGateway.ts
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@WebSocketGateway({ namespace: '/comment', cors: true })
export class CommentGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(private readonly commentService: CommentService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to comments: ${client.id}`);
  }

  handleDisconnection(client: Socket) {
    console.log(`Client disconnected from comments: ${client.id}`);
  }

  @SubscribeMessage('createComment')
  async handleCreateComment(client: Socket, data: { createCommentDto: CreateCommentDto; request: Request }) {
    const { createCommentDto, request } = data;
    const newComment = await this.commentService.createComment(createCommentDto, request);
    this.server.emit('commentCreated', newComment);
  }
}