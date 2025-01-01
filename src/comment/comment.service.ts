import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CommentEntity } from './entities/comment.entity';
import { PostEntity } from 'src/post/entities/post.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { REPLCommand } from 'repl';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { UpdateCommentDto } from './dto/update-comment.dto';
import * as moment from 'moment';
import { NotificationEntity } from 'src/notification/entities/notification.entity';
import e from 'express';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    @InjectRepository(ReactionEntity)
    private reactionRepository: Repository<ReactionEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>

  ) { }

  async createComment(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<any> {
    const { content, image, postId, parentId, replyId } = createCommentDto;

    const post = await this.postRepository.findOne({ where: { id: postId }, relations: ['created_by'] });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = this.commentRepository.create({
      content,
      image,
      created_by: { id: userId },
      post,
      parent: parentId ? { id: parentId } : null,
      reply: replyId ? { id: replyId } : null
    });

    const savedComment = await this.commentRepository.save(comment);

    const a = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName', 'avatar', 'username'],
    });

    // if (post.created_by.id !== userId) {
    //   await this.notificationRepository.save({
    //     userId: a.id,
    //     comment: savedComment,
    //     content: `${a.firstName} ${a.lastName} commented on your post.`,
    //     receiver: post.created_by,
    //     sender: a,
    //     type: 'comment',
    //     post: post
    //   });
    // }
    let notifyId1
    let notifyId2
    let notifyId3
    if (parentId) {
      if (replyId) {
        const reply = await this.commentRepository.findOne({ where: { id: replyId }, relations: ['created_by'] });
        if (post.created_by.id !== userId && post.created_by.id !== reply.created_by.id) {
          notifyId2 = await this.notificationRepository.save({
            userId: a.id,
            comment: savedComment,
            content: `${a.firstName} ${a.lastName} commented on your post.`,
            receiver: post.created_by,
            sender: a,
            type: 'comment',
            post: post
          });
        }
        if (reply.created_by.id != userId)
          notifyId3 = await this.notificationRepository.save({
            userId: a.id,
            comment: comment,
            content: `${a.firstName} ${a.lastName} replied to your comment.`,
            receiver: reply.created_by,
            sender: a,
            type: 'reply comment',
            post: post
          });
      };
      if (!replyId) {
        const parent = await this.commentRepository.findOne({ where: { id: parentId }, relations: ['created_by'] });
        if (post.created_by.id !== userId && post.created_by.id !== parent.created_by.id) {
          notifyId2 = await this.notificationRepository.save({
            userId: a.id,
            comment: savedComment,
            content: `${a.firstName} ${a.lastName} commented on your post.`,
            receiver: post.created_by,
            sender: a,
            type: 'comment',
            post: post
          });
        }
        if (parent.created_by.id != userId)
          notifyId3 = await this.notificationRepository.save({
            userId: a.id,
            comment: comment,
            content: `${a.firstName} ${a.lastName} replied to your comment.`,
            receiver: parent.created_by,
            sender: a,
            type: 'reply comment',
            post: post
          });
      }
    }
    else if (post.created_by.id !== userId) {
      notifyId1 = await this.notificationRepository.save({
        userId: a.id,
        comment: savedComment,
        content: `${a.firstName} ${a.lastName} commented on your post.`,
        receiver: post.created_by,
        sender: a,
        type: 'comment',
        post: post
      });
    }
    const createdAgoMoment = moment(savedComment.createdAt).subtract(7, 'hours');
    const now = moment();

    const diffMinutes = now.diff(createdAgoMoment, 'minutes');
    const diffHours = now.diff(createdAgoMoment, 'hours');
    const diffDays = now.diff(createdAgoMoment, 'days');
    const diffMonths = now.diff(createdAgoMoment, 'months');

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
      createdAgoText = createdAgoMoment.format('MMM D');
    }

    const createdAtFormatted = moment(savedComment.createdAt)
      .subtract(7, 'hours')
      .format('HH:mm DD-MM-YYYY');

    const createdBy = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName', 'avatar', 'username'],
    });

    let parentComment
    if (parentId) {
      parentComment = await this.commentRepository.findOne({
        where: { id: parentId },
        relations: ["created_by", "post"]
      });
    }
    let reply
    if (replyId) {
      reply = await this.commentRepository.findOne({
        where: { id: replyId },
        relations: ["created_by", "post"]
      })
    }
    return {
      id: savedComment.id,
      content: savedComment.content,
      image: savedComment.image,
      createdAt: createdAtFormatted,
      created_ago: createdAgoText,
      created_by: {
        id: createdBy.id,
        username: createdBy.username,
        fullName: `${createdBy.firstName} ${createdBy.lastName}`,
        avatar: createdBy.avatar,
      },
      post: savedComment.post,
      parent: parentComment
        ? {
          id: parentComment.id,
          content: parentComment.content,
          postId: parentComment.post.id,
          created_by: {
            id: parentComment.created_by.id,
            username: parentComment.created_by.username,
            fullName: `${parentComment.created_by.firstName} ${parentComment.created_by.lastName}`,
            avatar: parentComment.created_by.avatar,
          },
        }
        : undefined,
      reply: reply
        ? {
          id: reply.id,
          content: reply.content,
          postId: reply.post.id,
          created_by: {
            id: reply.created_by.id,
            username: reply.created_by.username,
            fullName: `${reply.created_by.firstName} ${reply.created_by.lastName}`,
            avatar: reply.created_by.avatar,
          },
        }
        : undefined,
      reactionCount: 0,
      notify1: notifyId3
        ? {
          id: notifyId3.id,
          content: notifyId3.content,
          type: notifyId3.type,
          postId: notifyId3.post.id,
          commentId: notifyId3.comment.id,
          sender: {
            id: notifyId3.sender.id,
            username: notifyId3.sender.username,
            fullName: `${notifyId3.sender.firstName} ${notifyId3.sender.lastName}`,
            avatar: notifyId3.sender.avatar,
          },
          receiver: {
            id: notifyId3.receiver.id,
            username: notifyId3.receiver.username,
            fullName: `${notifyId3.receiver.firstName} ${notifyId3.receiver.lastName}`,
            avatar: notifyId3.receiver.avatar,
          },
        }
        : notifyId1
          ? {
            id: notifyId1.id,
            content: notifyId1.content,
            type: notifyId1.type,
            postId: notifyId1.post.id,
            commentId: notifyId1.comment.id,
            sender: {
              id: notifyId1.sender.id,
              username: notifyId1.sender.username,
              fullName: `${notifyId1.sender.firstName} ${notifyId1.sender.lastName}`,
              avatar: notifyId1.sender.avatar,
            },
            receiver: {
              id: notifyId1.receiver.id,
              username: notifyId1.receiver.username,
              fullName: `${notifyId1.receiver.firstName} ${notifyId1.receiver.lastName}`,
              avatar: notifyId1.receiver.avatar,
            },
          }
          : undefined,
      notify2: notifyId2
        ? {
          id: notifyId2.id,
          content: notifyId2.content,
          type: notifyId2.type,
          postId: notifyId2.post.id,
          commentId: notifyId2.comment.id,
          sender: {
            id: notifyId2.sender.id,
            username: notifyId2.sender.username,
            fullName: `${notifyId2.sender.firstName} ${notifyId2.sender.lastName}`,
            avatar: notifyId2.sender.avatar,
          },
          receiver: {
            id: notifyId2.receiver.id,
            username: notifyId2.receiver.username,
            fullName: `${notifyId2.receiver.firstName} ${notifyId2.receiver.lastName}`,
            avatar: notifyId2.receiver.avatar,
          },
        }
        : undefined,
    };

  }


  async getCommentOfPostOrReplies(postId: number, commentId: string, params: PageOptionsDto, request: Request): Promise<any> {
    if (!postId && !commentId) throw new NotFoundException('Post or comment not found');
    const userId = request['user_data'].id;

    let queryBuilder = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.created_by', 'user')
      .leftJoinAndSelect('comment.reply', 'reply')
      .orderBy('comment.createdAt', 'DESC')
      .skip(params.skip)
      .take(params.pageSize);

    if (postId) {
      queryBuilder = queryBuilder
        .where('comment.post.id = :postId', { postId })
        .andWhere('comment.parent IS NULL');
    }

    if (commentId) {
      queryBuilder = queryBuilder
        .where('comment.parent.id = :commentId', { commentId });
    }

    const [comments, totalItemCount] = await queryBuilder.getManyAndCount();

    const commentMap = new Map<string, any>();

    for (const comment of comments) {
      const createdAgo = moment(comment.createdAt).subtract(7, 'hours');
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

      const createdAtFormatted = moment(comment.createdAt)
        .subtract(7, 'hours')
        .format('HH:mm DD-MM-YYYY');

      const reactionCount = await this.reactionRepository
        .createQueryBuilder('reaction')
        .where('reaction.commentId = :commentId', { commentId: comment.id })
        .getCount();

      const childCommentCount = await this.commentRepository
        .createQueryBuilder('childComment')
        .where('childComment.parent.id = :commentId', { commentId: comment.id })
        .getCount();

      const userReaction = await this.reactionRepository
        .createQueryBuilder('reaction')
        .where('reaction.commentId = :commentId', { commentId: comment.id })
        .andWhere('reaction.userId = :userId', { userId })
        .select(['reaction.reactionType'])
        .getOne();

      const isReacted = !!userReaction;

      let reactionType;
      if (userReaction) {
        reactionType = userReaction.reactionType;
      } else {
        const mostCommonReaction = await this.reactionRepository
          .createQueryBuilder('reaction')
          .where('reaction.commentId = :commentId', { commentId: comment.id })
          .select('reaction.reactionType')
          .addSelect('COUNT(reaction.reactionType)', 'count')
          .groupBy('reaction.reactionType')
          .orderBy('count', 'DESC')
          .limit(1)
          .getRawOne();

        reactionType = mostCommonReaction ? mostCommonReaction.reaction_reactionType : undefined;
      }

      if (commentId) {
        const parentComment = await this.commentRepository.findOne({
          where: { id: commentId },
          relations: ['created_by', 'post', 'reply'],
        });
        let replyComment = null
        if (comment.reply) {
          replyComment = await this.commentRepository.findOne({
            where: { id: comment.reply.id },
            relations: ['created_by', 'post', 'reply']
          })
        }

        commentMap.set(comment.id, {
          id: comment.id,
          content: comment.content,
          image: comment.image,
          created_by: {
            id: comment.created_by.id,
            username: comment.created_by.username,
            fullName: `${comment.created_by.firstName} ${comment.created_by.lastName}`,
            avatar: comment.created_by.avatar,
          },
          created_at: createdAtFormatted,
          created_ago: createdAgoText,
          reactionCount: reactionCount,
          reactionType: reactionType,
          isReacted: isReacted,
          commentCount: childCommentCount,
          parent: parentComment
            ? {
              id: parentComment.id,
              content: parentComment.content,
              postId: parentComment.post.id,
              created_by: {
                id: parentComment.created_by.id,
                username: parentComment.created_by.username,
                fullName: `${parentComment.created_by.firstName} ${parentComment.created_by.lastName}`,
                avatar: parentComment.created_by.avatar,
              },
            }
            : undefined,
          reply: replyComment
            ? {
              id: replyComment.id,
              content: replyComment.content,
              postId: replyComment.post.id,
              created_by: {
                id: replyComment.created_by.id,
                username: replyComment.created_by.username,
                fullName: `${replyComment.created_by.firstName} ${replyComment.created_by.lastName}`,
                avatar: replyComment.created_by.avatar,
              }
            } : undefined
        });
      } else {
        commentMap.set(comment.id, {
          id: comment.id,
          content: comment.content,
          image: comment.image,
          created_by: {
            id: comment.created_by.id,
            username: comment.created_by.username,
            fullName: `${comment.created_by.firstName} ${comment.created_by.lastName}`,
            avatar: comment.created_by.avatar
          },
          created_at: createdAtFormatted,
          created_ago: createdAgoText,
          reactionCount: reactionCount,
          reactionType: reactionType,
          isReacted: isReacted,
          commentCount: childCommentCount,
          parent: undefined,
        });
      }
      ;
    }

    return new PageDto(
      Array.from(commentMap.values()),
      new PageMetaDto({ itemCount: totalItemCount, pageOptionsDto: params }),
    );
  }

  async updateComment(id: string, updateCommentDto: UpdateCommentDto, request: Request): Promise<any> {
    const userId = request['user_data'].id;
    const existingComment = await this.commentRepository.findOne({
      where: { id },
      relations: ['created_by', 'post', 'parent', 'parent.created_by'],
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
    if (diffMinutes === 0) {
      createdAgoText = "Just now";
    } else if (diffMinutes < 60) {
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
        username: updatedComment.created_by.username,
        fullName: `${updatedComment.created_by.firstName} ${updatedComment.created_by.lastName}`,
        avatar: updatedComment.created_by.avatar
      },
      post: updatedComment.post,
      parent: updatedComment.parent ? {
        id: updatedComment.parent.id,
        content: updatedComment.parent.content,
        createAt: updatedComment.parent.createdAt,
        created_by: {
          id: updatedComment.parent.created_by.id,
          username: updatedComment.parent.created_by.username,
          fullName: `${updatedComment.parent.created_by.firstName} ${updatedComment.parent.created_by.lastName}`,
          avatar: updatedComment.parent.created_by.avatar
        },
      } : undefined,
    };
  }

  async deleteComment(id: string, request: Request): Promise<any> {
    const userId = request['user_data'].id;

    // Kiểm tra bình luận có tồn tại không
    const existingComment = await this.commentRepository.findOne({ where: { id } });
    if (!existingComment) {
        throw new Error('Comment is not found');
    }

    // Kiểm tra quyền xóa
    const commentCreator = await this.commentRepository.findOne({
        where: { id },
        relations: ["created_by"],
    });
    if (userId != commentCreator.created_by.id) {
        throw new Error('You are not allowed to delete this comment');
    }

    const getAllRelatedComments = async (commentId: string): Promise<string[]> => {
        const childComments = await this.commentRepository.find({ where: { parent: { id: commentId } } });
        const replyComments = await this.commentRepository.find({ where: { reply: { id: commentId } } });

        const relatedIds = [...childComments, ...replyComments].map(comment => comment.id);

        for (const relatedId of relatedIds) {
            const deeperRelatedIds = await getAllRelatedComments(relatedId);
            relatedIds.push(...deeperRelatedIds);
        }

        return relatedIds;
    };

    const allCommentIds = await getAllRelatedComments(id);
    allCommentIds.push(id); 

    await this.notificationRepository.delete({ comment: { id: In(allCommentIds) } });
    await this.reactionRepository.delete({ comment: { id: In(allCommentIds) } });

    await this.commentRepository.delete({ id: In(allCommentIds) });

    return {
        message: 'Comment was removed successfully',
        comment_id: id,
    };
}

}