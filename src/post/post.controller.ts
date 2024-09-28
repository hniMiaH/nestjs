import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { CreatePost } from './dto/create-new-post.dto';
import { PostEntity } from './entities/post.entity';

@ApiBearerAuth()
@ApiTags('post')
@Controller('post')
@UseGuards(AuthGuard) export class PostController {
    constructor(private postService: PostService) { }

    @Get(':id')
    async findById(
        @Param('id') id: number
    ) {
        return this.postService.getPostById(id);
    }

    @Post('createPost')
    async createUser(
        @Body() CreatePost: CreatePost
    ): Promise<PostEntity> {
        return this.postService.createPost(CreatePost)
    }
}