import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from './user.service';

@WebSocketGateway({ namespace: 'users', cors: true })
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly userService: UserService
    ) { }

    private onlineUsers = new Map<string, string>();

    handleConnection(client: Socket): void {
        const userId = client.handshake.query.userId as string;

        if (userId) {
            this.onlineUsers.set(userId, client.id);
            console.log('[WebSocket] Current online users:', Array.from(this.onlineUsers.keys()));
            console.log(`User connected: ${userId}, ${client.id}`);
        } else {
            console.log('Connection attempt without userId');
            client.disconnect();
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

    async getOnlineUsers(): Promise<any[]> {
        const onlineUserIds = Array.from(this.onlineUsers.keys());
        console.log('[UserGateway] Fetching online users:', onlineUserIds);

        const users = await this.userService.findUsersByIds(onlineUserIds);
        return users.map(user => ({
            id: user.id,
            username: user.username,
            fullName: `${user.firstName} ${user.lastName}`,
            avatar: user.avatar,
        }));
    }

    @SubscribeMessage('getOnlineUsers')
    async handleGetOnlineUsers(client: Socket): Promise<void> {
        const onlineUsers = await this.getOnlineUsers();
        console.log('[WebSocket] Sending online users to client:', onlineUsers);
        client.emit('onlineUsers', onlineUsers);
    }

}
