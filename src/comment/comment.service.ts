import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from './entities/comment.entity';
import { PostEntity } from 'src/post/entities/post.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { REPLCommand } from 'repl';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';


@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
  ) { }

  async createComment(
    user: UserEntity,
    createCommentDto: CreateCommentDto,
    request: Request
  ): Promise<Partial<CommentEntity>> {
    const { content, postId, image } = createCommentDto;
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
    });

    const savedComment = await this.commentRepository.save(comment);

    return {
      id: savedComment.id,
      content: savedComment.content,
      image: savedComment.image,
      created_by: savedComment.created_by,
      post: savedComment.post
    };
  }

  async getCommentOfPost(postId: number, params: PageOptionsDto): Promise<any> {
    if (!postId) throw new NotFoundException('Post not found'); 
  
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.created_by', 'user') 
      .where('comment.post.id = :postId', { postId })
      .orderBy('comment.createdAt', 'DESC') 
      .skip(params.skip)
      .take(params.pageSize);
  
    const [comments, itemCount] = await queryBuilder.getManyAndCount();
  
    const transformedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      image: comment.image,
      created_by: {
        id: comment.created_by.id,
        fullName: `${comment.created_by.firstName}${comment.created_by.lastName}`, 
      },
      created_at: comment.createdAt,
    }));
  
    const data = new PageDto(
      transformedComments,
      new PageMetaDto({ itemCount, pageOptionsDto: params })
    );
  
    return data;
  }
  
}