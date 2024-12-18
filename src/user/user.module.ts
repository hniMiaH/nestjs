import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { UserController } from './user.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { PostEntity } from 'src/post/entities/post.entity';
import { MessageEntity } from 'src/message/entities/message.entity';
import { UserGateway } from './user.gateway';
import { MessageService } from 'src/message/message.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationEntity } from 'src/notification/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, CommentEntity, ReactionEntity, PostEntity, MessageEntity, NotificationEntity]),
    ConfigModule
  ],
  controllers: [UserController],
  providers: [UserService, UserGateway, MessageService, NotificationService],
  exports: [UserService], 
})
export class UserModule {}
