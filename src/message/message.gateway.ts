import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus } from 'src/const';
import { UserConnectionService } from 'src/shared/user-connection.service';

@WebSocketGateway({ namespace: 'messages', cors: true })
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly messageService: MessageService,
        private readonly userConnectionService: UserConnectionService
    ) { }

    async handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            this.userConnectionService.setUserConnection(userId, client.id);
        }
    }

    async handleDisconnect(client: Socket) {
        this.userConnectionService.removeUserConnection(client.id);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() createMessageDto: CreateMessageDto,
        @ConnectedSocket() client: Socket
    ) {
        const senderId = this.userConnectionService.getUserSocketId(client.id);
        const receiverSocketId = this.userConnectionService.getUserSocketId(createMessageDto.receiverId);

        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('receiveMessage', createMessageDto);
        }
    }

    @SubscribeMessage('updateMessageStatus')
    async handleUpdateMessageStatus(
        @MessageBody() data: { messageId: string, status: MessageStatus }
    ) {
        const updatedMessage = await this.messageService.updateMessageStatus(data.messageId, data.status);
        this.server.emit('messageStatusUpdated', updatedMessage);
    }
}
