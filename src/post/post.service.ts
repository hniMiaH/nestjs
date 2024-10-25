import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { Repository, UpdateResult } from 'typeorm';
import { CreatePost } from './dto/create-new-post.dto';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { TagUserDto } from './dto/tag-user.dto';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { request } from 'http';


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

  async getAllPost(params: PageOptionsDto, request: Request): Promise<any> {

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.created_by', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName', 'user.avatar'])
      .orderBy('post.created_at', 'DESC')
      .skip(params.skip)
      .take(params.pageSize);


    const [entities, itemCount] = await queryBuilder.getManyAndCount();

    const transformedEntities = await Promise.all(entities.map(entity => this.transformEntity(entity, request)));
    const data = new PageDto(
      transformedEntities,
      new PageMetaDto({ itemCount, pageOptionsDto: params }),
    );
    return data;
  }

  async transformEntity(entity: PostEntity, request: Request): Promise<any> {
    const userId = request['user_data'].id;

    const userReaction = await this.reactionRepository
      .createQueryBuilder('reaction')
      .where('reaction.postId = :postId', { postId: entity.id })
      .andWhere('reaction.userId = :userId', { userId })
      .select(['reaction.id', 'reaction.reactionType'])
      .getOne();

    const reactions = await this.reactionRepository
      .createQueryBuilder('reaction')
      .leftJoinAndSelect('reaction.user', 'user')
      .where('reaction.postId = :postId', { postId: entity.id })
      .select(['reaction.id', 'user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
      .getMany();

    const reactionCount = reactions.length;

    const reactionUsers = reactions.map(reaction => ({
      id: reaction.user.id,
      userName: reaction.user.username,
      fullName: `${reaction.user.firstName} ${reaction.user.lastName}`,
    }));

    const commentCount = await this.commentRepository
      .createQueryBuilder('comment')
      .where('comment.postId = :postId', { postId: entity.id })
      .getCount();

    const taggedUsers = (entity.tags && Array.isArray(entity.tags)) ? await Promise.all(
      entity.tags.map(async tag => {
        const user = await this.userRepository.findOne({ where: { id: tag.userId } });
        return {
          id: tag.userId,
          userName: user.username,
          fullName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          avatar: user.avatar
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
        fullName: `${entity.created_by.firstName} ${entity.created_by.lastName}`,
        avatar: entity.created_by.avatar
      },
      reactionType: userReaction ? userReaction.reactionType : undefined,
    };
  }

  async getPostById(id: number, request: Request): Promise<any> {
    const post = await this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.created_by', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName', 'user.avatar'])
      .where('post.id = :id', { id })
      .getOne();

    if (!post) {
      throw new Error('Post not found');
    }

    return await this.transformEntity(post, request);
  }

  async createPost(payload: CreatePost, request: Request): Promise<any> {
    if (!payload.description && !payload.images?.length) {
      throw new HttpException('You must fill at least one property into post', HttpStatus.BAD_REQUEST);
    }

    const userId = request['user_data'].id;
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const newPost = this.postRepository.create({
      ...payload,
      images: payload.images || [],
      created_by: { id: userId },
    });

    const savedPost = await this.postRepository.save(newPost);

    return {
      id: savedPost.id,
      description: savedPost.description,
      images: savedPost.images,
      status: savedPost.status,
      created_at: savedPost.created_at,
      updated_at: savedPost.updated_at,
      created_by: {
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar
      },
    };
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

    const transformedPost = await this.transformEntity(post, request);

    return {
      message: 'Post updated successfully',
      post: transformedPost,
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
    const { postId, userIds } = tagUserDto;
    const belongUser = request['user_data'].id;
    const post = await this.postRepository.findOne({ where: { id: postId }, relations: ['created_by'] });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const isOwnerTaggingSelf = userIds.some(userId => userId === belongUser);
    if (isOwnerTaggingSelf) {
      throw new ForbiddenException('You cannot tag yourself in your own post');
    }

    const users = await this.userRepository.findByIds(userIds);
    const notFoundUserIds = userIds.filter(userId => !users.some(user => user.id === userId));

    if (notFoundUserIds.length > 0) {
      throw new NotFoundException(`Users not found: ${notFoundUserIds.join(', ')}`);
    }

    post.tags = post.tags || [];
    const taggedUsers = [];

    for (const userId of userIds) {
      const isTagged = post.tags.some(tag => tag.userId === userId);
      if (!isTagged) {
        post.tags.push({ userId });
        const user = users.find(u => u.id === userId);
        if (user) {
          taggedUsers.push({
            id: user.id,
            fullName: `${user.firstName} ${user.lastName}`,
            avatar: user.avatar,
          });
        }
      }
    }

    await this.postRepository.save(post);

    return {
      message: 'Users tagged successfully',
      postId,
      tagged_users: taggedUsers,
    };
  }

  async unTagUser(tagUserDto: TagUserDto, request: Request): Promise<any> {
    const { postId, userIds } = tagUserDto;
    const belongUser = request['user_data'].id;

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['created_by'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (userIds.includes(belongUser)) {
      throw new ForbiddenException('You cannot untag yourself from your own post');
    }

    const taggedUsers = post.tags.map(tag => tag.userId);
    const notTaggedUserIds = userIds.filter(userId => !taggedUsers.includes(userId));

    if (notTaggedUserIds.length > 0) {
      throw new BadRequestException(`Users are not tagged in this post: ${notTaggedUserIds.join(', ')}`);
    }

    const users = await this.userRepository.findByIds(userIds);

    const untaggedUserDetails = users.map(user => ({
      id: user.id,
      username: user.username,
      fullName: `${user.firstName} ${user.lastName}`,
    }));

    post.tags = post.tags.filter(tag => !userIds.includes(tag.userId));
    await this.postRepository.save(post);

    return {
      message: 'Users untagged successfully',
      postId,
      untagged_users: untaggedUserDetails,
    };
  }

  async searchPostsAndUsers(searchTerm: string, params: PageOptionsDto, request: Request): Promise<any> {
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
    const transformedPosts = await Promise.all(posts.map(post => this.transformEntity(post, request)));

    return {
      posts: transformedPosts,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar
      })),
      totalCount,
      postCount,
      userCount,
    };
  }

}