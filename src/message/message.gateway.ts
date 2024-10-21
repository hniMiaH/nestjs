import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    private activeUsers: Set<string> = new Set();

    constructor(private readonly messageService: MessageService) { }

    async handleConnection(client: Socket) {
        let userId: string | string[] = client.handshake.query.userId;

        if (Array.isArray(userId)) {
            userId = userId[0];
        }

        if (userId) {
            this.activeUsers.add(userId);
            this.server.emit('userStatus', { userId, status: 'online' });
        }
    }

    handleDisconnect(client: Socket) {
        let userId: string | string[] = client.handshake.query.userId;

        if (Array.isArray(userId)) {
            userId = userId[0];
        }

        if (userId) {
            this.activeUsers.delete(userId);
            this.server.emit('userStatus', { userId, status: 'offline' });
        }
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, payload: CreateMessageDto, req: Request) {
        try {
            const message = await this.messageService.createMessage(payload, req);
            this.server.emit('newMessage', message);
        } catch (error) {
            client.emit('errorMessage', error.message);
        }
    }
}
