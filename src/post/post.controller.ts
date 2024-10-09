import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { PostService } from './post.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { CreatePost } from './dto/create-new-post.dto';
import { PostEntity } from './entities/post.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { storageConfig } from 'helpers/config';
import { fileFilter } from 'uploads/avatar/upload.config';
import { TagUserDto } from './dto/tag-user.dto';
import { request } from 'http';


@ApiBearerAuth()
@ApiTags('post')
@Controller('post')
@UseGuards(AuthGuard) export class PostController {
    constructor(private postService: PostService) { }

    @Get('get-all-post')
    async findAll(
        @Query() params: PageOptionsDto,
    ) {
        return this.postService.getAllPost(params);
    }

    @Get('get-post/:id')
    async findById(
        @Param('id') id: number
    ) {
        return this.postService.getPostById(id);
    }

    @Post('create-post')
    @UseInterceptors(FileInterceptor('image', {
        storage: storageConfig('image'),
        fileFilter: fileFilter,
    }))
    @ApiConsumes('multipart/form-data')
    async createPost(
        @Req() req: Request,
        @UploadedFile() file: Express.Multer.File,
        @Body() createPostDto: CreatePost,
    ): Promise<PostEntity> {
        return this.postService.createPost({
            ...createPostDto,
            image: file ? file.destination + '/' + file.filename : null,
        }, req);
    }

    @Post('tag/:postId')
    async tagUsers(
        @Body() tagUserDto: TagUserDto,
        @Req() request: Request
    ) {
        return this.postService.tagUser({ postId: tagUserDto.postId, userId: tagUserDto.userId }, request);
    }

    @Post('update-post/:id')
    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('image', {
        storage: storageConfig('image'),
        fileFilter: fileFilter,
    }))
    @ApiConsumes('multipart/form-data')
    async uploadPost(
        @Param('id') postId: number,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: CreatePost,
        @Req() req: Request,
    ) {
        const existingPost = await this.postService.getPostById(postId);
        await this.postService.updatePost(postId, {
            ...body,
            image: file ? file.destination + '/' + file.filename : existingPost.image,
        }, req);
    }

    @Delete(':id')
    async removePost(@Param('id') id: number, @Req() request: Request): Promise<void> {
        return this.postService.deletePost(id, request);
    }
}
