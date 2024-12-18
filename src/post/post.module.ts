import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PostEntity } from './entities/post.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { PostGateway } from './post.gateway';
import { NotificationEntity } from 'src/notification/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity, UserEntity, ReactionEntity, CommentEntity, NotificationEntity]),
    ConfigModule
  ],
  providers: [PostService, PostGateway,],
  controllers: [PostController],
  exports: [PostService],
})
export class PostModule { }
