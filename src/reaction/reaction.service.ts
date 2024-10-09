import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from 'src/post/entities/post.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionEntity } from './entities/reaction.entity';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';

@Injectable()
export class ReactionService {
    constructor(
        @InjectRepository(PostEntity)
        private postRepository: Repository<PostEntity>,
        @InjectRepository(ReactionEntity)
        private readonly reactionRepository: Repository<ReactionEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
    ) { }

    async createReaction(request: Request, createReactionDto: CreateReactionDto): Promise<any> {
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

    async undoReaction(request: Request, postId: number): Promise<any> {
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

    async getReactionOfPost(postId: number, params: PageOptionsDto): Promise<PageDto<any>> {
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
            ])
            .where('reaction.postId = :postId', { postId })
            .skip(params.skip)
            .take(params.pageSize)
            .orderBy('reaction.id', 'DESC');

        const [reactions, itemCount] = await queryBuilder.getManyAndCount();

        const transformedReactions = reactions.map(reaction => ({
            reaction_id: reaction.id,
            reaction_type: reaction.reactionType,
            user: {
                id: reaction.user.id,
                fullName: `${reaction.user.firstName} ${reaction.user.lastName}`,
            },
        }));

        const pageMeta = new PageMetaDto({ itemCount, pageOptionsDto: params });

        return new PageDto(transformedReactions, pageMeta);
    }

    async transformEntity(entity: ReactionEntity): Promise<any> {
        return {
            id: entity.id,
            reactionType: entity.reactionType,
            user_id: entity.user.id,
            post_id: entity.post.id,
        };
    }
}