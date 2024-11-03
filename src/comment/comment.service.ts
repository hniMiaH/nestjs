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
    request: Request
  ): Promise<Partial<CommentEntity>> {
    const { content, image, postId, parentId } = createCommentDto;
    const userId = request['user_data'].id;

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

    return {
      id: savedComment.id,
      content: savedComment.content,
      image: savedComment.image,
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
      .orderBy('comment.createdAt', 'ASC')
      .getMany();

    const commentMap = new Map<string, any>();

    comments.forEach(comment => {
      commentMap.set(comment.id, {
        id: comment.id,
        content: comment.content,
        image: comment.image,
        created_by: {
          id: comment.created_by.id,
          fullName: `${comment.created_by.firstName} ${comment.created_by.lastName}`,
          avatar: comment.created_by.avatar
        },
        created_at: comment.createdAt,
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



  async updateComment(id: string, updateCommentDto: UpdateCommentDto, request: Request): Promise<CommentEntity> {
    const userId = request['user_data'].id;
    const existingComment = await this.commentRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.created_by.id !== userId) {
      throw new ForbiddenException('You are not allowed to update this comment');
    }

    Object.assign(existingComment, updateCommentDto);
    return this.commentRepository.save(existingComment);
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