import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty()
  @IsNotEmpty()
  conversationId: string;

  @IsNotEmpty()
  @ApiProperty()
  content: string;
}
