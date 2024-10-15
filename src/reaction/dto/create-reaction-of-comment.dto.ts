import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsUUID } from "class-validator";
import { reactionType } from "src/const";

export class CreateReactionOfCommentDto{
    @ApiProperty()
    reactionType: reactionType;
  
    @ApiProperty()
    commentId: string;
}