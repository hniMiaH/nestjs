import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus } from 'src/const';
import { UserConnectionService } from 'src/shared/user-connection.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';

@WebSocketGateway({ namespace: 'messages', cors: true })
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly messageService: MessageService,
        private readonly jwtService: JwtService,
        private configService: ConfigService
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
            });
            return payload['id'];
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async handleConnection(client: Socket) {
        try {
            const userId = await this.extractUserIdFromSocket(client);
            this.userSocketMap.set(userId, client.id);
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

    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @MessageBody() data: { conversationId: string },
        @ConnectedSocket() client: Socket
    ) {
        const { conversationId } = data;

        if (!conversationId) {
            throw new Error('Invalid data: Missing conversationId');
        }

        client.join(conversationId);
        console.log(`Client ${client.id} joined room ${conversationId}`);
    }

    @SubscribeMessage('leaveConversation')
    async handleLeaveConversation(
        @MessageBody() data: { conversationId: string },
        @ConnectedSocket() client: Socket
    ) {
        const { conversationId } = data;

        if (!conversationId) {
            throw new Error('Invalid data: Missing conversationId');
        }

        client.leave(conversationId);
        console.log(`Client ${client.id} left room ${conversationId}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, payload: { senderId: string; conversationId: string; content: string }) {
        console.log('Received payload:', payload);

        const { senderId, conversationId, content } = payload;

        if (!senderId || !conversationId || !content) {
            throw new Error('Invalid data: Missing required fields');
        }

        const createMessageDto: CreateMessageDto = { conversationId, content };

        const conversation = await this.messageService.getConver(conversationId);

        let receiverId: string;

        if (conversation.sender.id === senderId) {
            receiverId = conversation.receiver.id;
        } else {
            receiverId = conversation.sender.id;
        }

        const newMessage = await this.messageService.createMessage(createMessageDto, senderId);

        this.server.to(conversationId).emit('messageCreated', newMessage);
    }

    @SubscribeMessage('getConversation')
    async handleGetConversation(
        @MessageBody() data: { conversationId: string, pageOptions: PageOptionsDto },
        @ConnectedSocket() client: Socket
    ) {
        try {
            const { conversationId } = data;

            if (!conversationId) {
                throw new Error('Invalid data: Missing conversationId or pagination options');
            }

            const conversationData = await this.messageService.getConver(conversationId);
            console.log(conversationData)
            client.emit('conversationData', conversationData);
        } catch (error) {
            console.error('Error fetching conversation:', error.message);
            client.emit('error', { message: 'Failed to fetch conversation' });
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
