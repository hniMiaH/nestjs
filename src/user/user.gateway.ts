import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from './user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from 'src/message/entities/message.entity';
import { Repository } from 'typeorm';

@WebSocketGateway({ namespace: 'users', cors: true })
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly userService: UserService,
        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>,
    ) { }

    private onlineUsers = new Map<string, string>();

    handleConnection(client: Socket): void {

        console.log('[WebSocket] Current online users:', Array.from(this.onlineUsers.keys()));
        console.log(`User connected: ${client.id}`);

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
        console.log('[UserGateway] Fetching online users:', onlineUserIds);

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
        payload: { userId: string }
    ): Promise<void> {
        const { userId } = payload;

        this.onlineUsers.set(userId, client.id);
        console.log('[WebSocket] Current online users:', Array.from(this.onlineUsers.keys()));

        const onlineUsers = await this.getOnlineUsers(userId);
        console.log('[WebSocket] Sending online users to client:', onlineUsers);
        client.emit('onlineUsers', onlineUsers);
    }

}
