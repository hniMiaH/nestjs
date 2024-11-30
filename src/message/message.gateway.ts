import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus } from 'src/const';
import { UserConnectionService } from 'src/shared/user-connection.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({ namespace: 'messages', cors: true })
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly messageService: MessageService,
        private readonly jwtService: JwtService,
        private configService: ConfigService
    ) { }

    private async extractUserIdFromSocket(client: Socket): Promise<string> {
        const token = client.handshake.headers.authorization;
        if (!token) {
            throw new UnauthorizedException('Token is missing');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('SECRET')
            });
            return payload['id'];
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async handleConnection(client: Socket) {
        try {
            console.log(`Client connected: ${client.id}`);
        } catch (error) {
            console.log('Error extracting userId:', error);
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected from chat: ${client.id}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, payload: { senderId: string; conversationId: string; content: string }) {
        console.log('Received payload:', payload);

        const { senderId, conversationId, content } = payload;

        if (!senderId || !conversationId || !content) {
            throw new Error('Invalid data: Missing required fields');
        }

        const createMessageDto: CreateMessageDto = { conversationId, content };

        const newMessage = await this.messageService.createMessage(createMessageDto, senderId);
        this.server.emit('messageCreated', newMessage);
    }


    @SubscribeMessage('updateMessageStatus')
    async handleUpdateMessageStatus(
        @MessageBody() data: { messageId: string, status: MessageStatus }
    ) {
        const updatedMessage = await this.messageService.updateMessageStatus(data.messageId, data.status);
        this.server.emit('messageStatusUpdated', updatedMessage);
    }
}
