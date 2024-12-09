import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from 'src/post/entities/post.entity';
import { ReactionService } from './reaction.service';
import { ReactionController } from './reaction.controller';
import { UserEntity } from 'src/user/entities/user.entity';
import { ReactionEntity } from './entities/reaction.entity';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { MessageEntity } from 'src/message/entities/message.entity';
import { NotificationEntity } from 'src/notification/entities/notification.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ReactionEntity, PostEntity, UserEntity, CommentEntity, MessageEntity, NotificationEntity]),
        ConfigModule
    ],
    providers: [ReactionService],
    controllers: [ReactionController],
    exports: [ReactionService],
})
export class ReactionModule { }
