import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageStatus } from 'src/const';
import { UserConnectionService } from 'src/shared/user-connection.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { NotificationService } from './notification.service';

@WebSocketGateway({ namespace: 'notifications', cors: true })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly notificationService: NotificationService,
        private readonly jwtService: JwtService,
        private configService: ConfigService
    ) { }

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
            console.log(`Client connected: ${client.id}, UserId: ${userId}`);

        } catch (error) {
            console.log('Error extracting userId:', error);
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = await this.extractUserIdFromSocket(client);
        console.log(`Client connected: ${client.id}, UserId: ${userId}`);
    }

    @SubscribeMessage('getNotifications')
    async getNotifications(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { page: number, pageSize: number, search?: string },
    ) {
        const { page, pageSize, search } = data;
        const userId = await this.extractUserIdFromSocket(client);
        const skip = (page - 1) * pageSize;

        const pageOptions = { page, pageSize, search, skip }
        const result = await this.notificationService.getUserNotifications(userId, pageOptions);
        console.log(result);
        client.emit('Notifications', result);
    }
}
