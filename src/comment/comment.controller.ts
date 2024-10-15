import { Controller, Post, Body, UseGuards, Request, UseInterceptors, UploadedFile, Get, Query, Param, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';

@ApiBearerAuth()
@ApiTags('comment')
@Controller('comment')
@UseGuards(AuthGuard) export class CommentController {
    constructor(private commentService: CommentService) { }

    @Get('get-comment-of-post/:id')
    async getCMOfPost(
        @Param('id') id: number,
        @Query() dto: PageOptionsDto,
    ) {
        return this.commentService.getCommentOfPost(id, dto);
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
        const user = req.user;
        if (file) {
            createCommentDto.image = file.filename;
        }
        return this.commentService.createComment(user, createCommentDto, req);
    }

}
