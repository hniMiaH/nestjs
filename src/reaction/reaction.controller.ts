import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ReactionService } from './reaction.service';
import { ReactionEntity } from './entities/reaction.entity';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { CreateReactionOfPostDto } from './dto/create-reaction-of-post.dto';
import { CreateReactionOfCommentDto } from './dto/create-reaction-of-comment.dto';

@ApiBearerAuth()
@ApiTags('reaction')
@Controller('reaction')
@UseGuards(AuthGuard) export class ReactionController {
    constructor(private reactionService: ReactionService) { }

    @Post('create-reaction-of-post')
    async createReactionOfPost(
        @Req() req: Request,
        @Body() createReactionDto: CreateReactionOfPostDto
    ) {
        return this.reactionService.createReactionOfPost(req, createReactionDto);
    }

    @Delete('undo-reaction-of-post/:postId')
    async undoReaction(@Req() request: Request, @Param('postId') postId: number) {
        return this.reactionService.undoReactionOfPost(request, postId);
    }

    @Get('get-reaction-of-post/:postId')
    async getReactionOfPost(
        @Param('postId') postId: number,
        @Query() params: PageOptionsDto,
    ) {
        return this.reactionService.getReactionOfPost(postId, params);
    }

    @Post('create-reaction-of-commment')
    async createReactionOfComment(
        @Req() req: Request,
        @Body() createReactionDto: CreateReactionOfCommentDto
    ) {
        return this.reactionService.createReactionOfComment(req, createReactionDto);
    }

    @Delete('undo-reaction-of-comment/:commentId')
    async undoReactionOfComment(@Req() request: Request, @Param('commentId') commentId: string) {
        return this.reactionService.undoReactionOfComment(request, commentId);
    }

    @Get('get-reaction-of-comment/:commentId')
    async getReactionOfComment(
        @Param('commentId') commentId: string,
        @Query() params: PageOptionsDto,
    ) {
        return this.reactionService.getReactiontOfComment(commentId, params);
    }

}