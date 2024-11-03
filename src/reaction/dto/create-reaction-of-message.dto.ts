import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsUUID } from "class-validator";
import { reactionType } from "src/const";

export class CreateReactionOfMessageDto{
    @ApiProperty()
    reactionType: reactionType;
  
    @ApiProperty()
    messageId: string;
}