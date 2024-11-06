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
import * as moment from 'moment';


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
    const userId = request['user_data'].id;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const followingUserIds = user && user.followings ? user.followings : [];
    const viewedPosts = user && user.viewedPosts ? user.viewedPosts : [];

    let unseenEntities = [];
    let unseenItemCount = 0;

    if (followingUserIds.length > 0 && params.skip === 0) {
      const unseenPostsQueryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoin('post.created_by', 'user')
        .addSelect(['user.id', 'user.firstName', 'user.lastName', 'user.avatar'])
        .where('post.created_by IN (:...userIds)', { userIds: followingUserIds });

      if (viewedPosts.length > 0) {
        unseenPostsQueryBuilder.andWhere('post.id NOT IN (:...viewedPosts)', { viewedPosts });
      }

      unseenPostsQueryBuilder.orderBy('post.created_at', 'DESC')
        .take(params.pageSize);

      [unseenEntities, unseenItemCount] = await unseenPostsQueryBuilder.getManyAndCount();

      unseenEntities = unseenEntities.map(post => ({ ...post, isSeen: false }));
    }

    const allPostsQueryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.created_by', 'user')
      .addSelect(['user.id', 'user.firstName', 'user.lastName', 'user.avatar'])
      .orderBy('post.created_at', 'DESC')
      .skip(params.skip)
      .take(params.pageSize - unseenEntities.length);

    if (viewedPosts && viewedPosts.length > 0) {
      allPostsQueryBuilder.andWhere('post.id IN (:...viewedPosts)', { viewedPosts });
    }

    const [seenEntities] = await allPostsQueryBuilder.getManyAndCount();

    const seenEntitiesWithFlag = seenEntities.map(post => ({ ...post, isSeen: true }));

    const combinedEntities = params.skip === 0 ? [...unseenEntities, ...seenEntitiesWithFlag] : seenEntitiesWithFlag;
    const transformedEntities = await Promise.all(combinedEntities.map(entity => this.transformEntity(entity, request, entity.isSeen)));

    const totalItemCount = unseenItemCount + seenEntities.length;

    return new PageDto(
      transformedEntities,
      new PageMetaDto({ itemCount: totalItemCount, pageOptionsDto: params }),
    );
  }

  async transformEntity(entity: PostEntity, request: Request, isSeen: boolean): Promise<any> {
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

    // const reactionUsers = reactions.map(reaction => ({
    //   id: reaction.user.id,
    //   userName: reaction.user.username,
    //   fullName: `${reaction.user.firstName} ${reaction.user.lastName}`,
    // }));
    let createdAgo = moment(entity.created_at)
      .subtract(7, 'hours')
      .fromNow();

    if (createdAgo == 'a day ago') {
      createdAgo = '1 day ago';
    }

    const createdAtFormatted = moment(entity.created_at)
      .subtract(7, 'hours')
      .format('HH:mm DD-MM-YYYY');

    const updatedFormatted = moment(entity.updated_at)
      .subtract(7, 'hours')
      .format('HH:mm DD-MM-YYYY');

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
      comment_count: commentCount,
      created_ago: createdAgo,
      created_at: createdAtFormatted,
      updated_at: updatedFormatted,
      created_by: {
        id: entity.created_by.id,
        fullName: `${entity.created_by.firstName} ${entity.created_by.lastName}`,
        avatar: entity.created_by.avatar
      },
      reactionType: userReaction ? userReaction.reactionType : undefined,
      isSeen: isSeen,
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

    return await this.transformEntity(post, request, true);
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

    savedPost.updated_at = savedPost.created_at;

    await this.postRepository.save(savedPost);

    const createdAtFormatted = moment(savedPost.created_at)
      .subtract(7, 'hours')
      .format('HH:mm DD-MM-YYYY');

    const updatedFormatted = moment(savedPost.updated_at)
      .subtract(7, 'hours')
      .format('HH:mm DD-MM-YYYY');

    return {
      id: savedPost.id,
      description: savedPost.description,
      images: savedPost.images,
      status: savedPost.status,
      created_at: createdAtFormatted,
      updated_at: updatedFormatted,
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

    const transformedPost = await this.transformEntity(post, request, false);

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
    const transformedPosts = await Promise.all(posts.map(post => this.transformEntity(post, request, true)));

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