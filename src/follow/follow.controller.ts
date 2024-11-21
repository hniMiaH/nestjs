import { Controller, Post, Body, UseGuards, Req, Param, Delete, Get, Query } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { CreateMessageDto } from 'src/message/dto/create-message.dto';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';

@ApiBearerAuth()
@ApiTags('follow')
@Controller('follow')
@UseGuards(AuthGuard)

export class FollowController {
    constructor(private readonly followService: FollowService) { }

    @Post('/create-follow')
    @ApiBody({ schema: { properties: { followingId: { type: 'string' } } } })
    async followUser(
        @Body('followingId') followingId: string,
        @Req() request
    ) {
        const followerId = request['user_data'].id;
        return await this.followService.followUser(followerId, followingId);
    }

    @Delete('/remove-follow')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                followingId: { type: 'string', description: 'ID of the user to be unfollowed' },
            },
            required: ['followingId'],
        },
    })
    async unfollowUser(
        @Req() request,
        @Body('followingId') followingId: string,
    ) {
        const followerId = request['user_data'].id;
        return await this.followService.unfollowUser(followerId, followingId);
    }

    @Get('/get-followers-of-user/:userId')
    async getListFollowerOfUser(
        @Param('userId') userId: string,
        @Query() pageOptions: PageOptionsDto,
    ) {
        return this.followService.getFollowers(userId, pageOptions);
    }

    @Get('/get-followings-of-user/:userId')
    async getListFollowingOfUser(
        @Param('userId') userId: string,
        @Query() pageOptions: PageOptionsDto,
    ) {
        return this.followService.getFollowings(userId, pageOptions);
    }
}

