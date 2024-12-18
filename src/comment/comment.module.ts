import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentController } from './comment.controller';
import { PostEntity } from 'src/post/entities/post.entity';
import { CommentEntity } from './entities/comment.entity';
import { CommentService } from './comment.service';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { CommentGateway } from './comment.gateway';
import { UserEntity } from 'src/user/entities/user.entity';
import { NotificationEntity } from 'src/notification/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, PostEntity, ReactionEntity, UserEntity, NotificationEntity])],
  providers: [CommentService, CommentGateway],
  controllers: [CommentController],
})
export class CommentModule { }
