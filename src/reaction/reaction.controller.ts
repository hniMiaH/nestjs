import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ReactionService } from './reaction.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionEntity } from './entities/reaction.entity';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';

@ApiBearerAuth()
@ApiTags('reaction')
@Controller('reaction')
@UseGuards(AuthGuard) export class ReactionController {
    constructor(private reactionService: ReactionService) { }

    @Post('create-reaction')
    async createReaction(
        @Req() req: Request,
        @Body() createReactionDto: CreateReactionDto
    ) {
        return this.reactionService.createReaction(req, createReactionDto);
    }

    @Delete('undo-reaction/:postId')
    async undoReaction(@Req() request: Request, @Param('postId') postId: number) {
        return this.reactionService.undoReaction(request, postId);
    }

    @Get('get-reaction-of-post/:postId')
    async getReactionOfPost(
        @Param('postId') postId: number,
        @Query() params: PageOptionsDto,
    ) {
        return this.reactionService.getReactionOfPost(postId, params);
    }

}