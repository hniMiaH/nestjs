import { Controller, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('message')
@Controller('message')
@UseGuards(AuthGuard)

export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  @Post(':receiverId')
  async createMessage(

    @Body() createMessageDto: CreateMessageDto,
    @Req() req: Request,
  ) {
    return await this.messageService.createMessage(createMessageDto, req);
  }
}
