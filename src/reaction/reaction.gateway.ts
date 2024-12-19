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

import { JwtService } from '@nestjs/jwt';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { CreateReactionOfPostDto } from './dto/create-reaction-of-post.dto';
import { ReactionService } from './reaction.service';
import { reactionType } from 'src/const';
import { CreateReactionOfCommentDto } from './dto/create-reaction-of-comment.dto';

@WebSocketGateway({ namespace: 'reactions', cors: true })
export class ReactionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private configService: ConfigService,
        private reactionService: ReactionService

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
            await this.userSocketMap.set(userId, client.id);
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

    @SubscribeMessage('createReactionPost')
    async createReactionPost(
        @MessageBody() payload: { reactionType: reactionType, postId: number },
        @ConnectedSocket() client: Socket
    ) {
        const userId = await this.extractUserIdFromSocket(client);

        const { reactionType, postId } = payload;
        const createReactionDto: CreateReactionOfPostDto = { reactionType, postId };

        const { notify, ...reaction } = await this.reactionService.createReactionOfPost(userId, createReactionDto);
        this.server.to(postId.toString()).emit('reactionCreated', reaction);

        if (notify !== undefined) {
            const receiverSocketId = this.userSocketMap.get(notify.receiver.id);
            this.server.to(receiverSocketId).emit('notification', {
                id: notify.id,
                content: notify.content,
                type: notify.type,
                reactionType: notify.reactionType,
                postId: notify.postId,
                sender: notify.sender,
                receiver: notify.receiver,
            });
            console.log({
                id: notify.id,
                content: notify.content,
                type: notify.type,
                reactionType: notify.reactionType,
                postId: notify.postId,
                sender: notify.sender,
                receiver: notify.receiver,
            })
        }
    }

    @SubscribeMessage('createReactionComment')
    async createReactionComment(
        @MessageBody() payload: { reactionType: reactionType, commentId: string },
        @ConnectedSocket() client: Socket
    ) {
        const userId = await this.extractUserIdFromSocket(client);

        const { reactionType, commentId } = payload;
        const createReactionDto: CreateReactionOfCommentDto = { reactionType, commentId };

        const { notify, ...reaction } = await this.reactionService.createReactionOfComment(userId, createReactionDto);
        this.server.to(commentId).emit('reactionCreated', reaction);

        if (notify !== undefined) {
            const receiverSocketId = this.userSocketMap.get(notify.receiver.id);
            this.server.to(receiverSocketId).emit('notification', {
                id: notify.id,
                content: notify.content,
                type: notify.type,
                reactionType: notify.reactionType,
                postId: notify.postId,
                sender: notify.sender,
                receiver: notify.receiver,
            });
            console.log({
                id: notify.id,
                content: notify.content,
                type: notify.type,
                reactionType: notify.reactionType,
                postId: notify.postId,
                sender: notify.sender,
                receiver: notify.receiver,
            })
        }

    }
}
