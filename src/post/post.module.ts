import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PostEntity } from './entities/post.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PostEntity, UserEntity, ReactionEntity]),
    ConfigModule
  ],
  providers: [PostService],
  controllers: [PostController],
  exports: [PostService],
})
export class PostModule { }
