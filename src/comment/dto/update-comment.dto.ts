import { APP_FILTER } from '@nestjs/core';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCommentDto {

    @ApiProperty()
    content: string;

    @ApiProperty({
        description: 'Ảnh cho bình luận',
        required: false,
    })
    @IsOptional()
    image: string;
}