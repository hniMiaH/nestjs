import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { NotificationService } from './notification.service';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';

@ApiBearerAuth()
@ApiTags('notification')
@Controller('notification')
@UseGuards(AuthGuard)

export class NotificationController {
    constructor(
        private readonly  notificationService: NotificationService
    ) { }
    @Get('/get-all-notifications')
    async getAllNotif(
        @Query() params: PageOptionsDto,
        @Req() request
    ) {
        const userId = request['user_data'].id
        return await this.notificationService.getUserNotifications(userId, params,);
    }
}
