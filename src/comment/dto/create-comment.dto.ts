import { APP_FILTER } from '@nestjs/core';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty()
    content: string;

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Ảnh cho bình luận',
        required: false,
    }) 
    @IsOptional()
    image: string;

    @ApiProperty()
    postId: number;
}