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

    ) { }

    async createReactionOfPost(request: Request, createReactionDto: CreateReactionOfPostDto): Promise<any> {
        const userId = request['user_data'].id;

        const { reactionType, postId } = createReactionDto;

        const post = await this.postRepository.findOne({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('Post is not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });

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
            await this.reactionRepository.save(newReaction);
            return {
                reaction_id: newReaction.id,
                reaction_type: newReaction.reactionType,
                user_id: userId,
                post_id: post.id,
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
        const uniqueReactionTypes = await this.reactionRepository
            .createQueryBuilder('reaction')
            .select('reaction.reactionType')
            .where('reaction.postId = :postId', { postId })
            .distinct(true)
            .getMany();

        const typeUserReacted = Array.from(
            new Set(uniqueReactionTypes.map(type => type.reactionType))
        );
        const pageMeta = new PageMetaDto({ itemCount, pageOptionsDto: params });

        return {
            reactions: transformedReactions,
            pageMeta,
            typeUserReacted
        };
    }


    async createReactionOfComment(request: Request, createReactionDto: CreateReactionOfCommentDto): Promise<any> {
        const userId = request['user_data'].id;

        const { reactionType, commentId } = createReactionDto;

        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('Comment is not found');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });

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
            reaction_id: existingReaction.id,
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

        const uniqueReactionTypes = await this.reactionRepository
            .createQueryBuilder('reaction')
            .select('reaction.reactionType')
            .where('reaction.commentId = :commentId', { commentId })
            .distinct(true)
            .getMany();

        const typeUserReacted = Array.from(
            new Set(uniqueReactionTypes.map(type => type.reactionType))
        );

        const pageMeta = new PageMetaDto({ itemCount, pageOptionsDto: params });

        return {
            reactions: transformedReactions,
            pageMeta,
            typeUserReacted
        };
    }

}