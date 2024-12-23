import { Controller, Post, Body, UseGuards, Request, Get, Query, Param, Delete, Req, Put, } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiBearerAuth()
@ApiTags('comment')
@Controller('comment')
@UseGuards(AuthGuard) export class CommentController {
    constructor(private commentService: CommentService) { }

    @Get('get-comment-of-post/:id')
    @ApiQuery({ name: 'commentId', required: false })
    async getCMOfPost(
        @Req() req: Request,
        @Param('id') id: number,
        @Query() dto: PageOptionsDto,
        @Query('commentId') commentId?: string,

    ) {
        if (!id && !commentId) {
            throw new Error('Either postId or commentId must be provided');
        }
        return this.commentService.getCommentOfPostOrReplies(id, commentId, dto, req);
    }

    @Post('create-comment')
    @ApiBody({
        description: 'Tạo bình luận mới với file ảnh tùy chọn',
        type: CreateCommentDto,
    })
    async createComment(
        @Request() req,
        @Body() createCommentDto: CreateCommentDto,
    ) {
        const userId = req['user_data'].id;

        return this.commentService.createComment(createCommentDto, userId);
    }

    @Put('update-comment/:id')
    @ApiBody({
        type: UpdateCommentDto,
    })
    async updateComment(
        @Param('id') commentId: string,
        @Req() req: Request,
        @Body() updateCommentDto: UpdateCommentDto,
    ) {

        return this.commentService.updateComment(commentId, updateCommentDto, req);
    }

    @Delete(':id')
    async deleteComment(
        @Param('id') id: string,
        @Req() request: Request,
    ) {
        return this.commentService.deleteComment(id, request);
    }

}
