import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from './entities/comment.entity';
import { PostEntity } from 'src/post/entities/post.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { REPLCommand } from 'repl';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { UpdateCommentDto } from './dto/update-comment.dto';
import * as moment from 'moment';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    @InjectRepository(ReactionEntity)
    private reactionRepository: Repository<ReactionEntity>
  ) { }

  async createComment(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<any> {
    const { content, image, postId, parentId } = createCommentDto;

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = this.commentRepository.create({
      content,
      image,
      created_by: { id: userId },
      post,
      parent: parentId ? { id: parentId } : null
    });

    const savedComment = await this.commentRepository.save(comment);

    const createdAgoMoment = moment(savedComment.createdAt).subtract(7, 'hours');
    const now = moment();

    const diffMinutes = now.diff(createdAgoMoment, 'minutes');
    const diffHours = now.diff(createdAgoMoment, 'hours');
    const diffDays = now.diff(createdAgoMoment, 'days');
    const diffMonths = now.diff(createdAgoMoment, 'months');

    let createdAgoText: string;
    if (diffMinutes < 60) {
      createdAgoText = `${diffMinutes}m`;
    } else if (diffHours < 24) {
      createdAgoText = `${diffHours}h`;
    } else if (diffMonths < 1) {
      createdAgoText = `${diffDays}d`;
    } else {
      createdAgoText = createdAgoMoment.format('MMM D');
    }

    const createdAtFormatted = moment(savedComment.createdAt)
      .subtract(7, 'hours')
      .format('HH:mm DD-MM-YYYY');

    return {
      id: savedComment.id,
      content: savedComment.content,
      image: savedComment.image,
      createdAt: createdAtFormatted,
      created_ago: createdAgoText,
      created_by: savedComment.created_by,
      post: savedComment.post,
      parent: savedComment.parent
    };
  }

  async getCommentOfPost(postId: number, params: PageOptionsDto): Promise<any> {
    if (!postId) throw new NotFoundException('Post not found');

    const comments = await this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.created_by', 'user')
      .leftJoinAndSelect('comment.parent', 'parent')
      .where('comment.post.id = :postId', { postId })
      .orderBy('comment.createdAt', 'DESC')
      .getMany();

    const commentMap = new Map<string, any>();

    comments.forEach(comment => {

      const createdAgo = moment(comment.createdAt).subtract(7, 'hours');
      const now = moment();

      const diffMinutes = now.diff(createdAgo, 'minutes');
      const diffHours = now.diff(createdAgo, 'hours');
      const diffDays = now.diff(createdAgo, 'days');
      const diffMonths = now.diff(createdAgo, 'months');

      let createdAgoText: string;

      if (diffMinutes < 60) {
        createdAgoText = `${diffMinutes}m`;
      } else if (diffHours < 24) {
        createdAgoText = `${diffHours}h`;
      } else if (diffMonths < 1) {
        createdAgoText = `${diffDays}d`;
      } else {
        createdAgoText = createdAgo.format('MMM D');
      }

      const createdAtFormatted = moment(comment.createdAt)
        .subtract(7, 'hours')
        .format('HH:mm DD-MM-YYYY');

      commentMap.set(comment.id, {
        id: comment.id,
        content: comment.content,
        image: comment.image,
        created_by: {
          id: comment.created_by.id,
          fullName: `${comment.created_by.firstName} ${comment.created_by.lastName}`,
          avatar: comment.created_by.avatar
        },
        created_at: createdAtFormatted,
        created_ago: createdAgoText,
        children: []
      });
    });

    const result = [];
    comments.forEach(comment => {
      if (comment.parent) {
        const parent = commentMap.get(comment.parent.id);
        if (parent) {
          parent.children.push(commentMap.get(comment.id));
        }
      } else {
        result.push(commentMap.get(comment.id));
      }
    });

    const itemCount = result.length;
    const data = new PageDto(
      result,
      new PageMetaDto({ itemCount, pageOptionsDto: params })
    );

    return data;
  }

  async updateComment(id: string, updateCommentDto: UpdateCommentDto, request: Request): Promise<any> {
    const userId = request['user_data'].id;
    const existingComment = await this.commentRepository.findOne({
      where: { id },
      relations: ['created_by', 'post', 'parent'],
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.created_by.id !== userId) {
      throw new ForbiddenException('You are not allowed to update this comment');
    }

    Object.assign(existingComment, updateCommentDto);
    const updatedComment = await this.commentRepository.save(existingComment);

    const createdAgoMoment = moment(updatedComment.createdAt).subtract(7, 'hours');
    const now = moment();

    const diffMinutes = now.diff(createdAgoMoment, 'minutes');
    const diffHours = now.diff(createdAgoMoment, 'hours');
    const diffDays = now.diff(createdAgoMoment, 'days');
    const diffMonths = now.diff(createdAgoMoment, 'months');

    let createdAgoText: string;
    if (diffMinutes < 60) {
      createdAgoText = `${diffMinutes}m`;
    } else if (diffHours < 24) {
      createdAgoText = `${diffHours}h`;
    } else if (diffMonths < 1) {
      createdAgoText = `${diffDays}d`;
    } else {
      createdAgoText = createdAgoMoment.format('MMM D');
    }

    const createdAtFormatted = moment(updatedComment.createdAt)
      .subtract(7, 'hours')
      .format('HH:mm DD-MM-YYYY');

    return {
      id: updatedComment.id,
      content: updatedComment.content,
      image: updatedComment.image,
      createdAt: createdAtFormatted,
      created_ago: createdAgoText,
      created_by: {
        id: updatedComment.created_by.id,
        fullName: `${updatedComment.created_by.firstName} ${updatedComment.created_by.lastName}`,
        avatar: updatedComment.created_by.avatar
      },
      post: updatedComment.post,
      parent: updatedComment.parent,
    };
  }

  async deleteComment(id: string, request: Request): Promise<any> {
    const userId = request['user_data'].id;
    const existingComment = await this.commentRepository.findOne({ where: { id: id } })

    if (!existingComment) {
      throw new Error('Comment is not found')
    }
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (userId != comment.created_by.id)
      throw new Error('You are not allowed to delete this comment')
    await this.reactionRepository.delete({ comment: { id } });
    await this.commentRepository.delete({ parent: { id } })
    await this.commentRepository.delete(id)
    return {
      message: 'Comment was removed successfully',
      comment_id: id,
    };
  }
}