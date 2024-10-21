import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentController } from './comment.controller';
import { PostEntity } from 'src/post/entities/post.entity';
import { CommentEntity } from './entities/comment.entity';
import { CommentService } from './comment.service';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, PostEntity, ReactionEntity])],
  providers: [CommentService],
  controllers: [CommentController],
})
export class CommentModule {}
