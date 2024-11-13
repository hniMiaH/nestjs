import { Controller, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile, Get, Query, Param, Delete, Req, Put, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
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
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './uploads/comments',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    const filename = `${uniqueSuffix}${ext}`;
                    callback(null, filename);
                },
            }),
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Tạo bình luận mới với file ảnh tùy chọn',
        type: CreateCommentDto,
    })
    async createComment(
        @Request() req,
        @Body() createCommentDto: CreateCommentDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const userId = req['user_data'].id;
        if (file) {
            createCommentDto.image = file.filename;
        }
        return this.commentService.createComment(createCommentDto, userId);
    }

    @Put('update-comment/:id')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: './uploads/comments',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    const filename = `${uniqueSuffix}${ext}`;
                    callback(null, filename);
                },
            }),
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        type: UpdateCommentDto,
    })
    async updateComment(
        @Param('id') commentId: string,
        @Req() req: Request,
        @Body() updateCommentDto: UpdateCommentDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (file) {
            updateCommentDto.image = file.filename;
        }
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
