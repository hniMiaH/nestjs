import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from './entities/post.entity';
import { In, Repository, UpdateResult } from 'typeorm';
import { CreatePost } from './dto/create-new-post.dto';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { TagUserDto } from './dto/tag-user.dto';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { request } from 'http';
import * as moment from 'moment';
import { NotificationEntity } from 'src/notification/entities/notification.entity';


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
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>
  ) { }

  async getAllPost(
    params: PageOptionsDto,
    request: Request,
    postId?: number,
    userid?: string,
  ): Promise<any> {
    const userId = request['user_data'].id;

    if (postId) {
      return this.getPostById(postId, request);
    }

    if (userid) {
      const user = await this.userRepository.findOne({
        where: { id: userid },
        select: ['id', 'firstName', 'lastName', 'avatar'],
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const userPostsQueryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoin('post.created_by', 'user')
        .addSelect(['user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
        .where('post.created_by = :userId', { userId: userid })
        .orderBy('post.created_at', 'DESC')
        .skip(params.skip)
        .take(params.pageSize);

      const [userPosts, totalUserPostCount] = await userPostsQueryBuilder.getManyAndCount();

      const transformedUserPosts = await Promise.all(
        userPosts.map(post => this.transformEntity(post, request, false)),
      );

      return new PageDto(
        transformedUserPosts,
        new PageMetaDto({ itemCount: totalUserPostCount, pageOptionsDto: params }),
      );
    }

    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'followings'],
    });

    const userPostQueryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.created_by', 'user')
      .addSelect(['user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
      .where('post.created_by = :userId', { userId });

    if (currentUser.followings && currentUser.followings.length > 0) {
      // Người dùng có bài viết riêng và có following
      const userPosts = await userPostQueryBuilder.getMany();

      const followingPosts = await this.postRepository
        .createQueryBuilder('post')
        .leftJoin('post.created_by', 'user')
        .addSelect(['user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
        .where('post.created_by IN (:...followings)', { followings: currentUser.followings })
        .getMany();

      // Kết hợp bài viết của bản thân và của following
      const combinedPosts = [...userPosts, ...followingPosts];

      // Loại bỏ trùng lặp (nếu có) dựa trên `post.id`
      const uniquePosts = Array.from(new Map(combinedPosts.map(post => [post.id, post])).values());

      // Sắp xếp theo `created_at` giảm dần
      uniquePosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Phân trang
      const paginatedPosts = uniquePosts.slice(params.skip, params.skip + params.pageSize);

      const transformedPosts = await Promise.all(
        paginatedPosts.map(post => this.transformEntity(post, request, true)),
      );

      return new PageDto(
        transformedPosts,
        new PageMetaDto({ itemCount: uniquePosts.length, pageOptionsDto: params }),
      );
    }

    const userPosts = await userPostQueryBuilder.getMany();

    if (userPosts.length > 0) {
      // Người dùng có bài viết riêng nhưng không có following
      const paginatedPosts = userPosts.slice(params.skip, params.skip + params.pageSize);

      const transformedPosts = await Promise.all(
        paginatedPosts.map(post => this.transformEntity(post, request, true)),
      );

      return new PageDto(
        transformedPosts,
        new PageMetaDto({ itemCount: userPosts.length, pageOptionsDto: params }),
      );
    }

    const uniquePosts = new Map<number, any>();

    const mostReactedPosts = await this.reactionRepository
      .createQueryBuilder('reaction')
      .select('reaction.postId, COUNT(reaction.id) as reactionCount')
      .groupBy('reaction.postId')
      .orderBy('reactionCount', 'DESC')
      .getRawMany();

    const reactedPostIds = mostReactedPosts.map(r => r.postId);

    const reactedPosts = await this.postRepository.find({
      where: { id: In(reactedPostIds) },
      relations: ['created_by'],
    });

    const sortedReactedPosts = reactedPostIds.map(id =>
      reactedPosts.find(post => post.id === id)
    );

    sortedReactedPosts.slice(1).forEach(post => uniquePosts.set(post.id, post));

    const allPostsQueryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.created_by', 'user')
      .addSelect(['user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
      .orderBy('post.created_at', 'DESC');

    const allPosts = await allPostsQueryBuilder.getMany();

    allPosts.forEach(post => {
      if (!uniquePosts.has(post.id)) {
        uniquePosts.set(post.id, post);
      }
    });

    const combinedPosts = Array.from(uniquePosts.values());
    const paginatedPosts = combinedPosts.slice(params.skip, params.skip + params.pageSize);

    const transformedPosts = await Promise.all(
      paginatedPosts.map(post => this.transformEntity(post, request, true)),
    );

    return new PageDto(
      transformedPosts,
      new PageMetaDto({ itemCount: combinedPosts.length, pageOptionsDto: params }),
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

    let reactionType;
    const isReacted = !!userReaction;
    if (userReaction) {
      reactionType = userReaction.reactionType;
    } else {
      const mostCommonReaction = await this.reactionRepository
        .createQueryBuilder('reaction')
        .where('reaction.postId = :postId', { postId: entity.id })
        .select('reaction.reactionType')
        .addSelect('COUNT(reaction.reactionType)', 'count')
        .groupBy('reaction.reactionType')
        .orderBy('count', 'DESC')
        .limit(1)
        .getRawOne();

      reactionType = mostCommonReaction ? mostCommonReaction.reaction_reactionType : undefined;
    }


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
    const createdAgo = moment(entity.created_at).subtract(7, 'hours');
    const now = moment();

    const diffMinutes = now.diff(createdAgo, 'minutes');
    const diffHours = now.diff(createdAgo, 'hours');
    const diffDays = now.diff(createdAgo, 'days');
    const diffMonths = now.diff(createdAgo, 'months');

    let createdAgoText: string;

    if (diffMinutes === 0) {
      createdAgoText = "Just now";
    } else if (diffMinutes < 60) {
      createdAgoText = `${diffMinutes}m`;
    } else if (diffHours < 24) {
      createdAgoText = `${diffHours}h`;
    } else if (diffMonths < 1) {
      createdAgoText = `${diffDays}d`;
    } else {
      createdAgoText = createdAgo.format('MMM D');
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
      created_ago: createdAgoText,
      created_at: createdAtFormatted,
      updated_at: updatedFormatted,
      created_by: {
        id: entity.created_by.id,
        username: entity.created_by.username,
        fullName: `${entity.created_by.firstName} ${entity.created_by.lastName}`,
        avatar: entity.created_by.avatar
      },
      reactionType: reactionType,
      isSeen: isSeen,
      isReacted: isReacted,
    };
  }

  async getPostById(id: number, request: Request): Promise<any> {
    const post = await this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.created_by', 'user')
      .addSelect(['user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
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
        username: user.username,
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
    await this.notificationRepository.delete({ post: { id } });
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
    if (!searchTerm || searchTerm.trim() === '') {
      return {
        posts: [],
        users: [],
        totalCount: 0,
        postCount: 0,
        userCount: 0,
      };
    }
    const currentUserId = request['user_data'].id
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserId }
    });
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
      .where("LOWER(unaccent(user.firstName)) LIKE LOWER(unaccent(:searchTerm))", { searchTerm: `%${searchTerm}%` })
      .orWhere("LOWER(unaccent(user.lastName)) LIKE LOWER(unaccent(:searchTerm))", { searchTerm: `%${searchTerm}%` })
      .orWhere("LOWER(unaccent(CONCAT(user.firstName, user.lastName))) LIKE LOWER(unaccent(:searchTerm))", { searchTerm: `%${searchTerm}%` })
      .orWhere("LOWER(unaccent(CONCAT(user.firstName, ' ', user.lastName))) LIKE LOWER(unaccent(:searchTerm))", { searchTerm: `%${searchTerm}%` })
      .skip(params.skip)
      .take(params.pageSize);
    const [users, userCount] = await userQueryBuilder.getManyAndCount();

    const totalCount = postCount + userCount;

    const formattedUsers = users.map(user => {
      let isFollowing = "follow";

      if (currentUser?.followings?.includes(user.id)) {
        isFollowing = "following";
      }
      if (
        user.followings?.includes(currentUserId) && !currentUser?.followings?.includes(user.id)
      ) {
        isFollowing = "follow back";
      }

      return {
        id: user.id,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        isFollowing,
      };
    });

    const transformedPosts = await Promise.all(posts.map(post => this.transformEntity(post, request, true)));

    return {
      posts: transformedPosts,
      users: formattedUsers,
      totalCount,
      postCount,
      userCount,
    };
  }

  removeAccents(str: string): string {
    const cleanedStr = str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
    return cleanedStr;
  }


  async markPostAsSeen(userId: string, postIds: number | number[]): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.viewedPosts) {
      user.viewedPosts = [];
    }

    const postIdsArray = Array.isArray(postIds) ? postIds : [postIds];

    postIdsArray.forEach((postId) => {
      if (!user.viewedPosts.includes(postId)) {
        user.viewedPosts.push(postId);
      }
    });

    await this.userRepository.save(user);

    return user;
  }


  async getUnseenPosts(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['viewedPosts'] });

    if (!user) {
      throw new Error('User not found');
    }

    const viewedPosts = user.viewedPosts;

    const unseenPosts = await this.postRepository
      .createQueryBuilder('post')
      .where('post.id NOT IN (:...viewedPosts)', { viewedPosts })
      .orderBy('post.created_at', 'DESC')
      .getMany();

    return unseenPosts;
  }

}