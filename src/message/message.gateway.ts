import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus } from 'src/const';

@WebSocketGateway({ namespace: '/messages', cors: true })
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private activeUsers = new Map<string, string>();

    constructor(private readonly messageService: MessageService) { }

    async handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            this.activeUsers.set(userId, client.id);
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = [...this.activeUsers.entries()].find(([_, socketId]) => socketId === client.id)?.[0];
        if (userId) {
            this.activeUsers.delete(userId);
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() createMessageDto: CreateMessageDto,
        @ConnectedSocket() client: Socket
    ) {
        const senderId = [...this.activeUsers.entries()].find(([_, socketId]) => socketId === client.id)?.[0];

        if (!senderId) return;

        const message = await this.messageService.createMessage(createMessageDto, senderId);

        const receiverSocketId = this.activeUsers.get(createMessageDto.receiverId);

        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('receiveMessage', message);
        }

        return message;
    }

    @SubscribeMessage('updateMessageStatus')
    async handleUpdateMessageStatus(
        @MessageBody() data: { messageId: string, status: MessageStatus }
    ) {
        const updatedMessage = await this.messageService.updateMessageStatus(data.messageId, data.status);
        this.server.emit('messageStatusUpdated', updatedMessage);
    }
}
