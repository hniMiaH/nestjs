import { APP_FILTER } from '@nestjs/core';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty({
        required: false,
    })
    @IsOptional()
    content: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    image: string;

    @ApiProperty()
    postId: number;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    parentId: string;

    @ApiProperty({
        required: false,
    })
    replyId: string
}