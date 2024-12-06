import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from './user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from 'src/message/entities/message.entity';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { MessageService } from 'src/message/message.service';

@WebSocketGateway({ namespace: 'users', cors: true })
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly messageService: MessageService,


        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>,
    ) { }
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
    private onlineUsers = new Map<string, string>();

    async handleConnection(client: Socket) {
        try {
            const userId = await this.extractUserIdFromSocket(client);
            this.onlineUsers.set(userId, client.id);

            console.log(`Client connected: ${client.id}, UserId: ${userId}`);
            console.log('[WebSocket] Current online users:', Array.from(this.onlineUsers.keys()));

        } catch (error) {
            console.log('Error extracting userId:', error);
        }
    }

    handleDisconnect(client: Socket): void {
        const userId = Array.from(this.onlineUsers.keys()).find(
            (key) => this.onlineUsers.get(key) === client.id,
        );
        if (userId) {
            this.onlineUsers.delete(userId);
            console.log(`[WebSocket] User disconnected: ${userId}`);
            console.log('[WebSocket] Remaining online users:', Array.from(this.onlineUsers.keys()));
        }
    }

    async getUsersWhoMessaged(userId: string): Promise<string[]> {
        const messages = await this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .leftJoinAndSelect('message.receiver', 'receiver')
            .where('message.senderId = :userId OR message.receiverId = :userId', { userId })
            .andWhere('message.content IS NULL')
            .getMany();


        const userIds = new Set<string>();
        messages.forEach((message) => {
            if (message.sender.id !== userId) {
                userIds.add(message.sender.id);
            }
            if (message.receiver.id !== userId) {
                userIds.add(message.receiver.id);
            }
        });

        return Array.from(userIds);
    }

    async getOnlineUsers(userId: string): Promise<any[]> {
        const onlineUserIds = Array.from(this.onlineUsers.keys());

        const usersWhoMessaged = await this.getUsersWhoMessaged(userId);
        const filteredUserIds = onlineUserIds.filter(id => usersWhoMessaged.includes(id));

        const users = await this.userService.findUsersByIds(filteredUserIds);
        return users.map(user => ({
            id: user.id,
            username: user.username,
            fullName: `${user.firstName} ${user.lastName}`,
            avatar: user.avatar,
        }));
    }

    @SubscribeMessage('getOnlineUsers')
    async handleGetOnlineUsers(
        client: Socket,
    ): Promise<void> {
        const userId = await this.extractUserIdFromSocket(client);

        const onlineUsers = await this.getOnlineUsers(userId);
        console.log('[WebSocket] Sending online users to client:', onlineUsers);
        client.emit('onlineUsers', onlineUsers);
    }

    @SubscribeMessage('getConversation')
    async handleGetConversations(
        @MessageBody() data: { conversationId: string, pageOptions: PageOptionsDto },
        @ConnectedSocket() client: Socket
    ) {
        try {
            const { conversationId } = data;

            if (!conversationId) {
                throw new Error('Invalid data: Missing conversationId or pagination options');
            }

            const conversationData = await this.messageService.getConver(conversationId);
            console.log('[WebSocket] Fetched conversation data:', conversationData);

            client.emit('conversationData', conversationData);

            const receiverId = conversationData.receiver.id;
            if (this.onlineUsers.has(receiverId)) {
                const receiverSocketId = this.onlineUsers.get(receiverId);

                if (receiverSocketId) {
                    this.server.to(receiverSocketId).emit('conversationUpdate', conversationData);
                    console.log(`[WebSocket] Conversation update sent to receiverId: ${receiverId}`);
                }
            }
        } catch (error) {
            console.error('[WebSocket] Error fetching conversation:', error.message);
            client.emit('error', { message: 'Failed to fetch conversation' });
        }
    }

}
