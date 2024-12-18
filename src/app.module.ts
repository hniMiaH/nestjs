import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from 'db/data-source';
import { PostController } from './post/post.controller';
import { PostModule } from './post/post.module';
import { CommonController } from './common/common.controller';
import { CommonModule } from './common/common.module';
import { CommentController } from './comment/comment.controller';
import { CommentService } from './comment/comment.service';
import { CommentModule } from './comment/comment.module';
import { ReactionController } from './reaction/reaction.controller';
import { ReactionService } from './reaction/reaction.service';
import { ReactionModule } from './reaction/reaction.module';
import { MessageController } from './message/message.controller';
import { MessageService } from './message/message.service';
import { MessageModule } from './message/message.module';
import { FollowController } from './follow/follow.controller';
import { FollowService } from './follow/follow.service';
import { FollowModule } from './follow/follow.module';
import { NotificationController } from './notification/notification.controller';
import { NotificationService } from './notification/notification.service';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    UserModule,
    AuthModule,
    PostModule,
    CommonModule,
    CommentModule,
    ReactionModule,
    MessageModule,
    FollowModule,
    NotificationModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
