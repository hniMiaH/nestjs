import { ApiProperty } from "@nestjs/swagger";

export class CreatePost {
    @ApiProperty()
    title: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    thumbnail: string;

    @ApiProperty()
    image: string;

    @ApiProperty()
    status: number;
}