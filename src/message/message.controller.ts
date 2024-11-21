import { Controller, Post, Body, UseGuards, Req, Param, Delete, Get } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('message')
@Controller('message')
@UseGuards(AuthGuard)

export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  @Post('/create-message')
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() request
  ) {
    const senderId = request['user_data'].id;
    return await this.messageService.createMessage(createMessageDto, senderId);
  }

  @Delete('/remove-message/:messageId')
  @ApiBody({ schema: { properties: { messageId: { type: 'string' } } } })
  async deleteMessage(
    @Body('messageId') messageId: string,
    @Req() request
  ) {
    const userId = request['user_data'].id;
    return await this.messageService.removeMessage(messageId, userId)
  }

  @Get('/get-conversation/:receiverId')
  async getConversationOfUser(
    @Param('receiverId') receiverId: string,
    @Req() request
  ) {
    const senderId = request['user_data'].id
    return await this.messageService.getConversation(receiverId, senderId)
  }
}
