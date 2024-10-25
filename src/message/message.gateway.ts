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
import { MessageStatus } from 'src/const';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly messageService: MessageService) { }

    handleConnection(client: Socket, request: Request) {
        console.log(`Client connected: ${client.id}`);

        const userId = request['user_data'].id;
        ;
        client.data.userId = userId;
    }
    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, createMessageDto: CreateMessageDto) {
        const senderId = client.data.userId;
        const message = await this.messageService.createMessage(createMessageDto, senderId);

        this.server.to(createMessageDto.receiverId).emit('receiveMessage', message);
    }

    @SubscribeMessage('messageSeen')
    async handleMessageSeen(client: Socket, messageId: string) {
        const message = await this.messageService.updateMessageStatus(messageId, MessageStatus.READ);

        this.server.to(message.receiver.id).emit('messageSeen', message);
    }
}
