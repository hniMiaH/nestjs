// follow.service.ts
import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';

@Injectable()
export class FollowService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async followUser(followerId: string, followingId: string): Promise<{ message: string, isFollowing: string }> {
        if (followerId === followingId) {
            throw new HttpException('You cannot follow yourself.', HttpStatus.BAD_REQUEST);
        }

        const follower = await this.userRepository.findOne({ where: { id: followerId } });
        const following = await this.userRepository.findOne({ where: { id: followingId } });

        if (!follower || !following) {
            throw new NotFoundException('User does not exist.');
        }

        follower.followings = follower.followings || [];
        following.followers = following.followers || [];

        if (!follower.followings.includes(followingId)) {
            follower.followings.push(followingId);
        }

        if (!following.followers.includes(followerId)) {
            following.followers.push(followerId);
        }

        await this.userRepository.save([follower, following]);

        let isFollowing = "follow";
        if (follower.followings?.includes(followingId)) {
            isFollowing = "following";
        }
        if (
            following.followings?.includes(followerId) &&
            !follower.followings?.includes(followingId)
        ) {
            isFollowing = "follow back";
        }
        if (
            following.followings?.includes(followerId) &&
            follower.followings?.includes(followingId)
        ) {
            isFollowing = "friend";
        }

        return {
            message: 'Followed successfully',
            isFollowing,
        };
    }



    async unfollowUser(followerId: string, followingId: string): Promise<{ message: string, isFollowing: string }> {
        const follower = await this.userRepository.findOne({ where: { id: followerId } });
        const following = await this.userRepository.findOne({ where: { id: followingId } });

        if (!follower || !following || !follower.followings.includes(followingId)) {
            throw new NotFoundException('Follow relationship does not exist.');
        }

        follower.followings = follower.followings.filter(id => id !== followingId);
        following.followers = following.followers.filter(id => id !== followerId);

        await this.userRepository.save([follower, following]);

        let isFollowing = "follow";
        if (
            following.followings?.includes(followerId) &&
            !follower.followings?.includes(followingId)
        ) {
            isFollowing = "follow back";
        }

        return {
            message: 'Unfollowed successfully',
            isFollowing,
        };
    }

    async getFollowers(userId: string, req: Request, options?: PageOptionsDto): Promise<PageDto<any>> {
        const currentUserId = req['user_data'].id
        const currentUser = await this.userRepository.findOne({
            where: { id: currentUserId }
        });

        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException('User not found.');
        }

        const followerIds = user.followers || [];

        if (followerIds.length === 0) {
            const pageMetaDto = new PageMetaDto({ itemCount: 0, pageOptionsDto: options });
            return new PageDto([], pageMetaDto);
        }

        const pageMetaDto = new PageMetaDto({ itemCount: followerIds.length, pageOptionsDto: options });

        const followers = await this.userRepository.createQueryBuilder('user')
            .where('user.id IN (:...followerIds)', { followerIds })
            .addSelect(['user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
            .getMany();


        const formattedFollowers = followers.map(entity => {
            let isFollowing = "follow";

            if (currentUser.id == user.id) {

                if (currentUser?.followings?.includes(entity.id)) {
                    isFollowing = "following";
                }
                if (entity?.followings?.includes(currentUser.id)) {
                    isFollowing = "follow back";
                }
                if (
                    currentUser?.followings?.includes(entity.id) &&
                    entity?.followings?.includes(currentUser.id)
                ) {
                    isFollowing = "friend";
                }
            }
            else {
                if (currentUser?.followings?.includes(user.id)) {
                    isFollowing = "following";
                }
                if (
                    user?.followings?.includes(currentUserId) && !currentUser?.followings?.includes(user.id)
                ) {
                    isFollowing = "follow back";
                }
                if (
                    user?.followings?.includes(currentUserId) && currentUser?.followings?.includes(user.id)
                ) {
                    isFollowing = "friend";
                }
            }
            return {
                id: entity.id,
                userName: entity.username,
                fullName: `${entity.firstName} ${entity.lastName}`,
                avatar: entity.avatar,
                isFollowing,
            };
        });

        return new PageDto(formattedFollowers, pageMetaDto);
    }

    async getFollowings(userId: string, req: Request, options?: PageOptionsDto): Promise<PageDto<any>> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const currentUserId = req['user_data'].id
        const currentUser = await this.userRepository.findOne({
            where: { id: currentUserId }
        });

        if (!user) {
            throw new NotFoundException('User not found.');
        }

        const followingIds = user.followings || [];

        if (followingIds.length === 0) {
            const pageMetaDto = new PageMetaDto({ itemCount: 0, pageOptionsDto: options });
            return new PageDto([], pageMetaDto);
        }

        const pageMetaDto = new PageMetaDto({ itemCount: followingIds.length, pageOptionsDto: options });

        const followings = await this.userRepository.createQueryBuilder('user')
            .where('user.id IN (:...followingIds)', { followingIds })
            .addSelect(['user.id', 'user.username', 'user.firstName', 'user.lastName', 'user.avatar'])
            .getMany();

        const formattedFollowings = followings.map(entity => {
            let isFollowing = "follow";


            if (currentUser.id == user.id) {
                if (currentUser?.followings?.includes(entity.id)) {
                    isFollowing = "following";
                }
                if (entity?.followings?.includes(currentUser.id)) {
                    isFollowing = "follow back";
                }
                if (
                    currentUser?.followings?.includes(entity.id) &&
                    entity?.followings?.includes(currentUser.id)
                ) {
                    isFollowing = "friend";
                }
            }
            else {
                if (currentUser?.followings?.includes(user.id)) {
                    isFollowing = "following";
                }
                if (
                    user.followings?.includes(currentUserId) && !currentUser?.followings?.includes(user.id)
                ) {
                    isFollowing = "follow back";
                }
                if (
                    user.followings?.includes(currentUserId) && currentUser?.followings?.includes(user.id)
                ) {
                    isFollowing = "friend";
                }
            }

            return {
                id: entity.id,
                userName: entity.username,
                fullName: `${entity.firstName} ${entity.lastName}`,
                avatar: entity.avatar,
                isFollowing,
            };
        });
        return new PageDto(formattedFollowings, pageMetaDto);
    }
}
