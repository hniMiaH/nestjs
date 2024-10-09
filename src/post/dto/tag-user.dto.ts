// src/tag/dto/tag-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TagUserDto {
    @ApiProperty()
    @IsNumber()
    postId: number;

    @ApiProperty()
    @IsString()
    userId: string;
}
