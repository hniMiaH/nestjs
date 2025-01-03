import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from 'src/post/entities/post.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { ReactionEntity } from './entities/reaction.entity';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { CreateReactionOfPostDto } from './dto/create-reaction-of-post.dto';
import { CreateReactionOfCommentDto } from './dto/create-reaction-of-comment.dto';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { CreateMessageDto } from 'src/message/dto/create-message.dto';
import { CreateReactionOfMessageDto } from './dto/create-reaction-of-message.dto';
import { MessageEntity } from 'src/message/entities/message.entity';
import { NotificationEntity } from 'src/notification/entities/notification.entity';

@Injectable()
export class ReactionService {
    constructor(
        @InjectRepository(PostEntity)
        private postRepository: Repository<PostEntity>,
        @InjectRepository(ReactionEntity)
        private readonly reactionRepository: Repository<ReactionEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @InjectRepository(CommentEntity)
        private commentRepository: Repository<CommentEntity>,
        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>,
        @InjectRepository(NotificationEntity)
        private notificationRepository: Repository<NotificationEntity>


    ) { }

    async createReactionOfPost(userId: string, createReactionDto: CreateReactionOfPostDto): Promise<any> {

        const { reactionType, postId } = createReactionDto;

        const post = await this.postRepository.findOne({
            where: { id: postId },
            relations: ['created_by'],
        });
        if (!post) {
            throw new NotFoundException('Post is not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        let notify
        let existingReaction = await this.reactionRepository.findOne({
            where: {
                user: { id: userId },
                post: { id: post.id },
            },
        });

        if (existingReaction) {
            existingReaction.reactionType = reactionType;
            await this.reactionRepository.save(existingReaction);

            return {
                reaction_id: existingReaction.id,
                reaction_type: reactionType,
                user_id: userId,
                post_id: post.id,
            }
        } else {
            const newReaction = this.reactionRepository.create({
                reactionType,
                user,
                post,
            });

            if (post.created_by.id !== userId) {
                console.log('Saving notification with data:', {
                    post: post,
                    content: `${user.firstName} ${user.lastName} reacted to your post`,
                    receiver: post.created_by,
                });
                notify = await this.notificationRepository.save({
                    type: 'react post',
                    userId: user.id,
                    post: post,
                    content: `${user.firstName} ${user.lastName} reacted ${reactionType} to your post`,
                    receiver: post.created_by,
                    reactionType: reactionType,
                    sender: user,
                });
            }

            await this.reactionRepository.save(newReaction);
            return {
                reaction_id: newReaction.id,
                reaction_type: newReaction.reactionType,
                user_id: userId,
                post_id: post.id,
                notify: {
                    id: notify.id,
                    content: notify.content,
                    type: notify.type,
                    postId: notify.post.id,
                    reactionType: notify.reactionType,
                    sender: {
                        id: notify.sender.id,
                        username: notify.sender.username,
                        fullName: `${notify.sender.firstName} ${notify.sender.lastName}`,
                        avatar: notify.sender.avatar,
                    },
                    receiver: {
                        id: notify.receiver.id,
                        username: notify.receiver.username,
                        fullName: `${notify.receiver.firstName} ${notify.receiver.lastName}`,
                        avatar: notify.receiver.avatar,
                    },
                }
            }
        }
    }

    async undoReactionOfPost(request: Request, postId: number): Promise<any> {
        const userId = request['user_data'].id;

        const post = await this.postRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('Post is not found');
        }

        const existingReaction = await this.reactionRepository.findOne({
            where: {
                user: { id: userId },
                post: { id: post.id },
            },
        });

        if (!existingReaction) {
            throw new NotFoundException('Reaction not found for this post by the user');
        }

        await this.reactionRepository.remove(existingReaction);

        return {
            message: 'Reaction has been removed successfully',
            user_id: userId,
            post_id: post.id,
        };
    }

    async getReactionOfPost(
        postId: number,
        params: PageOptionsDto,
        reactionTypes?: string[]
    ): Promise<any> {
        const post = await this.postRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('Post is not found');
        }

        const queryBuilder = this.reactionRepository
            .createQueryBuilder('reaction')
            .leftJoin('reaction.user', 'user')
            .select([
                'reaction.id',
                'reaction.reactionType',
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.avatar',
                'user.username'
            ])
            .where('reaction.postId = :postId', { postId });

        if (reactionTypes && reactionTypes.length > 0) {
            queryBuilder.andWhere('reaction.reactionType IN (:...reactionTypes)', {
                reactionTypes,
            });
        }

        if (params.search) {
            queryBuilder.andWhere('reaction.reactionType LIKE :search', {
                search: `%${params.search}%`,
            });
        }

        queryBuilder
            .skip(params.skip)
            .take(params.pageSize)
            .orderBy('reaction.id', 'DESC');

        const [reactions, itemCount] = await queryBuilder.getManyAndCount();

        const transformedReactions = reactions.map(reaction => ({
            reaction_id: reaction.id,
            reaction_type: reaction.reactionType,
            user: {
                id: reaction.user.id,
                userName: reaction.user.username,
                fullName: `${reaction.user.firstName} ${reaction.user.lastName}`,
                avatar: reaction.user.avatar,
            },
        }));

        const reactionTypeCounts = await this.reactionRepository
            .createQueryBuilder('reaction')
            .select('reaction.reactionType', 'reactionType')
            .addSelect('COUNT(reaction.id)', 'count')
            .where('reaction.postId = :postId', { postId })
            .groupBy('reaction.reactionType')
            .getRawMany();

        const typeUserReacted = reactionTypeCounts.map(type => ({
            type: type.reactionType,
            count: parseInt(type.count, 10)
        }));

        const pageMeta = new PageMetaDto({ itemCount, pageOptionsDto: params });

        return {
            reactions: transformedReactions,
            pageMeta,
            typeUserReacted
        };
    }

    async createReactionOfComment(userId: string, createReactionDto: CreateReactionOfCommentDto): Promise<any> {

        const { reactionType, commentId } = createReactionDto;

        const comment = await this.commentRepository.findOne({
            where: { id: commentId },
            relations: ['created_by', 'post'],
        });
        if (!comment) {
            throw new NotFoundException('Comment is not found');
        }
        let notify
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (comment.created_by.id !== userId) {
            notify = await this.notificationRepository.save({
                type: 'react comment',
                userId: user.id,
                post: comment.post,
                comment: comment,
                content: `${user.firstName} ${user.lastName} reacted ${reactionType} to your comment`,
                receiver: comment.created_by,
                reactionType: reactionType,
                sender: user,
            });
        }
        let existingReaction = await this.reactionRepository.findOne({
            where: {
                user: { id: userId },
                comment: { id: comment.id },
            },
        });

        if (existingReaction) {
            existingReaction.reactionType = reactionType;
            await this.reactionRepository.save(existingReaction);
            return {
                reaction_id: existingReaction.id,
                reaction_type: reactionType,
                user_id: userId,
                comment_id: comment.id,
            };
        } else {
            const newReaction = this.reactionRepository.create({
                reactionType,
                user,
                comment,
            });
            await this.reactionRepository.save(newReaction);
            return {
                reaction_id: newReaction.id,
                reaction_type: newReaction.reactionType,
                user_id: userId,
                comment_id: comment.id,
                notify: {
                    id: notify.id,
                    content: notify.content,
                    type: notify.type,
                    postId: notify.post.id,
                    commentId: notify.comment.id,
                    reactionType: notify.reactionType,
                    sender: {
                        id: notify.sender.id,
                        username: notify.sender.username,
                        fullName: `${notify.sender.firstName} ${notify.sender.lastName}`,
                        avatar: notify.sender.avatar,
                    },
                    receiver: {
                        id: notify.receiver.id,
                        username: notify.receiver.username,
                        fullName: `${notify.receiver.firstName} ${notify.receiver.lastName}`,
                        avatar: notify.receiver.avatar,
                    },
                }
            };
        }
    }

    async undoReactionOfComment(request: Request, commentId: string): Promise<any> {
        const userId = request['user_data'].id;

        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('Comment is not found');
        }
        const existingReaction = await this.reactionRepository.findOne({
            where: {
                user: { id: userId },
                comment: { id: commentId },
            },
        });

        if (!existingReaction) {
            throw new NotFoundException('Reaction not found for this comment');
        }

        await this.reactionRepository.remove(existingReaction);

        return {
            message: 'Reaction removed successfully',
            user_id: userId,
            comment_id: comment.id,
        };
    }

    async getReactionOfComment(
        commentId: string,
        params: PageOptionsDto,
        reactionTypes?: string[]
    ): Promise<any> {
        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('Comment is not found');
        }

        const queryBuilder = this.reactionRepository
            .createQueryBuilder('reaction')
            .leftJoin('reaction.user', 'user')
            .select([
                'reaction.id',
                'reaction.reactionType',
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.avatar',
                'user.username'
            ])
            .where('reaction.commentId = :commentId', { commentId });

        if (reactionTypes && reactionTypes.length > 0) {
            queryBuilder.andWhere('reaction.reactionType IN (:...reactionTypes)', {
                reactionTypes,
            });
        }

        if (params.search) {
            queryBuilder.andWhere('reaction.reactionType LIKE :search', {
                search: `%${params.search}%`,
            });
        }

        queryBuilder
            .skip(params.skip)
            .take(params.pageSize)
            .orderBy('reaction.id', 'DESC');

        const [reactions, itemCount] = await queryBuilder.getManyAndCount();

        const transformedReactions = reactions.map(reaction => ({
            reaction_id: reaction.id,
            reaction_type: reaction.reactionType,
            user: {
                id: reaction.user.id,
                userName: reaction.user.username,
                fullName: `${reaction.user.firstName} ${reaction.user.lastName}`,
                avatar: reaction.user.avatar,
            },
        }));

        const reactionTypeCounts = await this.reactionRepository
            .createQueryBuilder('reaction')
            .select('reaction.reactionType', 'reactionType')
            .addSelect('COUNT(reaction.id)', 'count')
            .where('reaction.commentId = :commentId', { commentId })
            .groupBy('reaction.reactionType')
            .getRawMany();

        const typeUserReacted = reactionTypeCounts.map(type => ({
            type: type.reactionType,
            count: parseInt(type.count, 10)
        }));

        const pageMeta = new PageMetaDto({ itemCount, pageOptionsDto: params });

        return {
            reactions: transformedReactions,
            pageMeta,
            typeUserReacted
        };
    }

    async createReactionOfMessage(request: Request, createReactionDto: CreateReactionOfMessageDto): Promise<any> {
        const userId = request['user_data'].id;

        const { reactionType, messageId } = createReactionDto;

        const message = await this.messageRepository.findOne({ where: { id: messageId } });
        if (!message) {
            throw new NotFoundException('Message is not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });

        let existingReaction = await this.reactionRepository.findOne({
            where: {
                user: { id: userId },
                comment: { id: message.id },
            },
        });

        if (existingReaction) {
            existingReaction.reactionType = reactionType;
            await this.reactionRepository.save(existingReaction);
            return {
                reaction_id: existingReaction.id,
                reaction_type: reactionType,
                user_id: userId,
                message_id: message.id,
            };
        } else {
            const newReaction = this.reactionRepository.create({
                reactionType,
                user,
                message,
            });
            await this.reactionRepository.save(newReaction);
            return {
                reaction_id: newReaction.id,
                reaction_type: newReaction.reactionType,
                user_id: userId,
                message_id: message.id,
            };
        }
    }

    async undoReactionOfMessage(request: Request, messageId: string): Promise<any> {
        const userId = request['user_data'].id;

        const message = await this.messageRepository.findOne({ where: { id: messageId } });
        if (!message) {
            throw new NotFoundException('Message is not found');
        }
        const existingReaction = await this.reactionRepository.findOne({
            where: {
                user: { id: userId },
                comment: { id: messageId },
            },
        });

        if (!existingReaction) {
            throw new NotFoundException('Reaction not found for this message');
        }

        await this.reactionRepository.remove(existingReaction);

        return {
            message: 'Reaction removed successfully',
            reaction_id: existingReaction.id,
        };
    }

    async getReactionOfMessage(
        messageId: string,
        params: PageOptionsDto,
        reactionTypes?: string[]
    ): Promise<any> {
        const message = await this.messageRepository.findOne({ where: { id: messageId } });
        if (!message) {
            throw new NotFoundException('Message is not found');
        }

        const queryBuilder = this.reactionRepository
            .createQueryBuilder('reaction')
            .leftJoin('reaction.user', 'user')
            .select([
                'reaction.id',
                'reaction.reactionType',
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.avatar',
                'user.username'
            ])
            .where('reaction.messageId = :messageId', { messageId });

        if (reactionTypes && reactionTypes.length > 0) {
            queryBuilder.andWhere('reaction.reactionType IN (:...reactionTypes)', {
                reactionTypes,
            });
        }

        if (params.search) {
            queryBuilder.andWhere('reaction.reactionType LIKE :search', {
                search: `%${params.search}%`,
            });
        }

        queryBuilder
            .skip(params.skip)
            .take(params.pageSize)
            .orderBy('reaction.id', 'DESC');

        const [reactions, itemCount] = await queryBuilder.getManyAndCount();

        const transformedReactions = reactions.map(reaction => ({
            reaction_id: reaction.id,
            reaction_type: reaction.reactionType,
            user: {
                id: reaction.user.id,
                userName: reaction.user.username,
                fullName: `${reaction.user.firstName} ${reaction.user.lastName}`,
                avatar: reaction.user.avatar,
            },
        }));

        const reactionTypeCounts = await this.reactionRepository
            .createQueryBuilder('reaction')
            .select('reaction.reactionType', 'reactionType')
            .addSelect('COUNT(reaction.id)', 'count')
            .where('reaction.messageId = :messageId', { messageId })
            .groupBy('reaction.reactionType')
            .getRawMany();

        const typeUserReacted = reactionTypeCounts.map(type => ({
            type: type.reactionType,
            count: parseInt(type.count, 10)
        }));

        const pageMeta = new PageMetaDto({ itemCount, pageOptionsDto: params });

        return {
            reactions: transformedReactions,
            pageMeta,
            typeUserReacted
        };
    }

}