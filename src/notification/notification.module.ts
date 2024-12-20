import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';
import { CommentEntity } from 'src/comment/entities/comment.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([NotificationEntity, CommentEntity]),
        ConfigModule
    ],
    providers: [NotificationService, NotificationGateway],
    controllers: [NotificationController],
    exports: [NotificationService],
})
export class NotificationModule { }
