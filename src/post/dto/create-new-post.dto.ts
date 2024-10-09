import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class CreatePost {
    @ApiProperty({ required: false })
    @IsOptional()
    title: string;

    @ApiProperty({ required: false })
    @IsOptional()
    description: string;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    @IsOptional()
    image: string;
}
