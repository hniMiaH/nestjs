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
import { reactionType } from 'src/const';
import { FollowService } from './follow.service';

@WebSocketGateway({ namespace: 'follows', cors: true })
export class FollowGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private configService: ConfigService,
        private followService: FollowService
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

    @SubscribeMessage('followUser')
    async createReactionPost(
        @MessageBody() payload: { followingId: string },
        @ConnectedSocket() client: Socket
    ) {
        const followerId = await this.extractUserIdFromSocket(client);

        const { followingId } = payload;

        const { notify, ...follow } = await this.followService.followUser(followerId, followingId);

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