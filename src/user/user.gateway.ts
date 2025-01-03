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
import { NotificationService } from 'src/notification/notification.service';
import { NotificationEntity } from 'src/notification/entities/notification.entity';

@WebSocketGateway({ namespace: 'users', cors: true })
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly messageService: MessageService,
        private readonly notificationService: NotificationService,

        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>,
        @InjectRepository(NotificationEntity)
        private notificationRepository: Repository<NotificationEntity>
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
    private io: Server;

    async handleConnection(client: Socket) {
        try {
            const userId = await this.extractUserIdFromSocket(client);
            this.onlineUsers.set(userId, client.id);

            console.log(`Client connected: ${client.id}, UserId: ${userId}`);
            console.log('[WebSocket] Current online users:', Array.from(this.onlineUsers.keys()));

            this.notifyOnlineUsers();

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

            this.notifyOnlineUsers();
        }
    }

    private async getUserDetails(userId: string): Promise<{ id: string, avatar: string, fullName: string, username: string } | null> {
        const user = await this.userService.getUserById(userId);
        if (user) {
            return {
                id: user.id,
                avatar: user.avatar,
                fullName: `${user.firstName} ${user.lastName}`,
                username: user.username
            };
        }
        return null;
    }
    private async notifyOnlineUsers(): Promise<void> {
        const currentOnlineUsers = Array.from(this.onlineUsers.keys());

        for (const userId of currentOnlineUsers) {
            const usersWhoMessaged = await this.getUsersWhoMessaged(userId);

            const filteredOnlineUsers = currentOnlineUsers.filter((id) => usersWhoMessaged.includes(id) && id !== userId);

            const userDetails = await Promise.all(
                filteredOnlineUsers.map((id) => this.getUserDetails(id))
            );

            const onlineUserDetails = userDetails.filter((user) => user !== null) as Array<{
                id: string,
                avatar: string,
                fullName: string,
                username: string
            }>;

            const socketId = this.onlineUsers.get(userId);
            if (socketId) {
                this.server.to(socketId).emit('updateUserOnline', onlineUserDetails);
            }
        }
    }

    // private async notifyOfflineUsers(disconnectedUserId: string): Promise<void> {
    //     const currentOnlineUsers = Array.from(this.onlineUsers.keys());
    //     const userDetails = await Promise.all(
    //         currentOnlineUsers.map((userId) => this.getUserDetails(userId))
    //     );

    //     const onlineUserDetails = userDetails.filter((user) => user !== null) as Array<{
    //         id: string,
    //         avatar: string,
    //         fullName: string,
    //         username: string
    //     }>;

    //     currentOnlineUsers.forEach((userId) => {
    //         const socketId = this.onlineUsers.get(userId);
    //         if (socketId) {
    //             this.server.to(socketId).emit('updateUserOnline', onlineUserDetails);
    //         }
    //     });
    // }

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
        @MessageBody() data: { conversationId: string, senderId: string, pageOptions: PageOptionsDto },
        @ConnectedSocket() client: Socket
    ) {
        try {
            const { conversationId, senderId } = data;

            if (!conversationId) {
                throw new Error('Invalid data: Missing conversationId or pagination options');
            }

            const conversationData = await this.messageService.getConver(conversationId);
            console.log('[WebSocket] Fetched conversation data:', conversationData);

            // client.emit('conversationData', conversationData);

            let receiverId: string;

            if (conversationData.receiver.id === senderId) {
                receiverId = conversationData.sender.id;
            } else {
                receiverId = conversationData.receiver.id;
            }
            if (this.onlineUsers.has(receiverId)) {
                const receiverSocketId = this.onlineUsers.get(receiverId);
                console.log('[WebSocket] Receiver is online:', receiverId);

                // if (receiverSocketId && receiverSocketId !== senderId) {
                //     console.log('senderid', senderId);
                this.server.to(receiverSocketId).emit('conversationUpdate', conversationData);
                //     console.log(`[WebSocket] Conversation update sent to receiverId: ${receiverId}`);
                // }
            }
        } catch (error) {
            console.error('[WebSocket] Error fetching conversation:', error.message);
            client.emit('error', { message: 'Failed to fetch conversation' });
        }
    }

    @SubscribeMessage('getNotifications')
    async getNotifications(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { page: number, pageSize: number, search?: string },
    ) {
        const { page, pageSize, search } = data;
        const userId = await this.extractUserIdFromSocket(client);
        const skip = (page - 1) * pageSize;

        const pageOptions = { page, pageSize, search, skip };
        const result = await this.notificationService.getUserNotifications(userId, pageOptions);
        console.log(result);

        const receiverSocketId = this.onlineUsers.get(userId);
        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('newNotification', result);
            console.log(`[WebSocket] Notification sent to receiverId: ${userId}`);
        }
    }

    @SubscribeMessage('sendNotification')
    async sendNotification(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { id1: string, id2?: string },
    ) {
        const { id1, id2 } = data;

        const notify1 = await this.notificationRepository.findOne({
            where: { id: id1 },
            relations: ['sender', 'receiver', 'post', 'comment'],
        });

        if (!notify1) {
            return 'Notification is not exist'
        }
        const notification1 = {
            id: notify1.id,
            content: notify1.content,
            type: notify1.type,
            postId: notify1.post ? notify1.post.id : undefined,
            commentId: notify1.comment ? notify1.comment.id : undefined,
            reactionType: notify1.reactionType ? notify1.reactionType : undefined,
            sender: {
                id: notify1.sender.id,
                username: notify1.sender.username,
                fullName: `${notify1.sender.firstName} ${notify1.sender.lastName}`,
                avatar: notify1.sender.avatar,
            },
            receiver: {
                id: notify1.receiver.id,
                username: notify1.receiver.username,
                fullName: `${notify1.receiver.firstName} ${notify1.receiver.lastName}`,
                avatar: notify1.receiver.avatar,
            },
        };

        const receiverSocketId1 = this.onlineUsers.get(notify1.receiver.id);
        if (receiverSocketId1) {
            console.log(notification1)
            this.server.to(receiverSocketId1).emit('messageCreated', notification1);
        }

        const notify2 = await this.notificationRepository.findOne({
            where: { id: id2 },
            relations: ['sender', 'receiver', 'post', 'comment'],
        });

        if (id2) {
            const notification2 = {
                id: notify2.id,
                content: notify2.content,
                type: notify2.type,
                postId: notify2.post ? notify2.post.id : undefined,
                commentId: notify2.comment ? notify2.comment.id : undefined,
                reactionType: notify2.reactionType ? notify2.reactionType : undefined,
                sender: {
                    id: notify2.sender.id,
                    username: notify2.sender.username,
                    fullName: `${notify2.sender.firstName} ${notify2.sender.lastName}`,
                    avatar: notify2.sender.avatar,
                },
                receiver: {
                    id: notify2.receiver.id,
                    username: notify2.receiver.username,
                    fullName: `${notify2.receiver.firstName} ${notify2.receiver.lastName}`,
                    avatar: notify2.receiver.avatar,
                },
            };

            const receiverSocketId2 = this.onlineUsers.get(notify2.receiver.id);
            if (receiverSocketId2) {
                console.log(notification2)
                this.server.to(receiverSocketId2).emit('messageCreated', notification2);
            }
        }
    }
}
