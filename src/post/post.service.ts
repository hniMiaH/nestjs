import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { Repository, UpdateResult } from 'typeorm';
import { CreatePost } from './dto/create-new-post.dto';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { TagUserDto } from './dto/tag-user.dto';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { CommentEntity } from 'src/comment/entities/comment.entity';


@Injectable()
export class PostService {
  constructor(
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(ReactionEntity)
    private reactionRepository: Repository<ReactionEntity>,
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>
  ) { }

  async getAllPost(params: PageOptionsDto, userId?: number): Promise<any> {

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.created_by', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName'])
      .orderBy('post.created_at', 'DESC')
      .skip(params.skip)
      .take(params.pageSize);


    const [entities, itemCount] = await queryBuilder.getManyAndCount();

    const transformedEntities = await Promise.all(entities.map(entity => this.transformEntity(entity)));
    const data = new PageDto(
      transformedEntities,
      new PageMetaDto({ itemCount, pageOptionsDto: params }),
    );
    return data;
  }

  async transformEntity(entity: PostEntity): Promise<any> {

    const reactions = await this.reactionRepository
      .createQueryBuilder('reaction')
      .leftJoinAndSelect('reaction.user', 'user') // Thêm thông tin user liên quan
      .where('reaction.postId = :postId', { postId: entity.id })
      .select(['reaction.id', 'user.id', 'user.username', 'user.firstName', 'user.lastName']) // Chọn các trường cần thiết
      .getMany();

    const reactionCount = reactions.length; // Đếm số lượng reactions

    const reactionUsers = reactions.map(reaction => ({
      id: reaction.user.id,
      userName: reaction.user.username,
      fullName: `${reaction.user.firstName}${reaction.user.lastName}`,
    }));

    const commentCount = await this.commentRepository
      .createQueryBuilder('comment')
      .where('comment.postId = :postId', { postId: entity.id })
      .getCount();

    const taggedUsers = (entity.tags && Array.isArray(entity.tags)) ? await Promise.all(
      entity.tags.map(async tag => {
        const user = await this.userRepository.findOne({ where: { id: tag.userId } });
        return {
          userId: tag.userId,
          userName: user.username,
          fullName: user ? `${user.firstName}${user.lastName}` : 'Unknown',
        };
      })
    ) : [];

    return {
      id: entity.id,
      description: entity.description,
      images: entity.images,
      status: entity.status === 1 ? 'changed' : undefined,
      tagged_users: taggedUsers,
      reaction_count: reactionCount,
      reactions: reactionUsers,
      comment_count: commentCount,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      created_by: {
        id: entity.created_by.id,
        fullName: `${entity.created_by.firstName}${entity.created_by.lastName}`,
      }
    };
  }

  async getPostById(id: number): Promise<PostEntity> {
    return await this.postRepository.findOneBy({ id });
  }

  async createPost(payload: CreatePost, request: Request): Promise<PostEntity> {
    if (!payload.description && !payload.images?.length) {
      throw new HttpException('You must fill at least one property into post', HttpStatus.BAD_REQUEST);
    }
    const userId = request['user_data'].id;
    const newPost = this.postRepository.create({
      ...payload,
      images: payload.images || [],
      created_by: { id: userId },
    });
    return await this.postRepository.save(newPost);
  }

  async updatePost(id: number, updatePostDto: CreatePost, request: Request): Promise<any> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['created_by'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const userId = request['user_data'].id;
    if (post.created_by.id != userId) {
      throw new HttpException('You are not allowed to update this post', HttpStatus.FORBIDDEN);
    }

    const hasChanged = Object.keys(updatePostDto).some(key => {
      return post[key] !== updatePostDto[key];
    });

    if (hasChanged) {
      Object.assign(post, updatePostDto);
      post.updated_at = new Date();
      post.status = 1;
      await this.postRepository.save(post);
    }

    return {
      message: 'post updated successfully',
      post: post
    };
  }

  async deletePost(id: number, request: Request): Promise<any> {
    const post = await this.postRepository.findOne({ where: { id }, relations: ['created_by', 'comments', 'comments.reactions', 'reactions'] });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const userId = request['user_data'].id;
    if (post.created_by.id != userId) {
      throw new HttpException('You are not allowed to delete this post', HttpStatus.FORBIDDEN);
    }
    for (const comment of post.comments) {
      await this.reactionRepository.delete({ comment: { id: comment.id } });
    }
    await this.commentRepository.delete({ post: { id } });
    await this.reactionRepository.delete({ post: { id } });
    await this.postRepository.delete(id);

    return 'Post deleted successfully';
  }

  async tagUser(tagUserDto: TagUserDto, request: Request): Promise<any> {
    const { postId, userId } = tagUserDto;
    const belongUser = request['user_data'].id;
    const post = await this.postRepository.findOne({ where: { id: postId }, relations: ['created_by'] });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.created_by.id == belongUser) {
      throw new ForbiddenException('This post is belong to you');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isTagged = post.tags?.some(tag => tag.userId === userId);

    if (!isTagged) {
      post.tags = post.tags || [];
      post.tags.push({ userId });
      await this.postRepository.save(post);
    }

    return {
      message: 'User tagged successfully',
      postId,
      userId,
    };
  }

  async searchPostsAndUsers(searchTerm: string, params: PageOptionsDto): Promise<any> {
    const cleanSearchTerm = searchTerm.startsWith('#') ? searchTerm.substring(1) : searchTerm;

    const postQueryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.created_by', 'user')
      .where('post.description LIKE :searchTerm', { searchTerm: `%#${cleanSearchTerm}%` })
      .orWhere("post.tags::jsonb @> :tag", { tag: `["#${cleanSearchTerm}"]` })
      .orderBy('post.created_at', 'DESC')
      .skip(params.skip)
      .take(params.pageSize);

    const [posts, postCount] = await postQueryBuilder.getManyAndCount();

    const userQueryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.firstName LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('user.lastName LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('user.username LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere("CONCAT(user.firstName, user.lastName) LIKE :searchTerm", { searchTerm: `%${searchTerm}%` })
      .skip(params.skip)
      .take(params.pageSize);

    const [users, userCount] = await userQueryBuilder.getManyAndCount();

    const totalCount = postCount + userCount;
    const transformedPosts = await Promise.all(posts.map(post => this.transformEntity(post)));

    return {
      posts: transformedPosts,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
      })),
      totalCount,
      postCount,
      userCount,
    };
  }

}