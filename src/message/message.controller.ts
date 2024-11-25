import { Controller, Post, Body, UseGuards, Req, Param, Delete, Get, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';

@ApiBearerAuth()
@ApiTags('message')
@Controller('message')
@UseGuards(AuthGuard)

export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  @Get('/get-all-conversation')
  async getAllConversationOfUser(
    @Query() params: PageOptionsDto,
    @Req() request
  ) {
    const userId = request['user_data'].id
    return await this.messageService.getAllConversationsOfUser(params, userId);
  }
  @ApiBody({ schema: { properties: { receiverId: { type: 'string' } } } })
  @Post('/create-conversation')
  async createConvesation(
    @Body('receiverId') receiverId: string,
    @Req() request
  ) {
    return await this.messageService.createConversation(receiverId, request);
  }

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
    @Query() params: PageOptionsDto,
    @Param('receiverId') receiverId: string,
    @Req() request
  ) {
    const senderId = request['user_data'].id
    return await this.messageService.getConversation(receiverId, senderId, params)
  }
}
