// follow.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { UserEntity } from 'src/user/entities/user.entity';
import { NotificationEntity } from 'src/notification/entities/notification.entity';
import { FollowGateway } from './follow.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, NotificationEntity])],
  providers: [FollowService,FollowGateway],
  controllers: [FollowController],
  exports: [FollowService],
})
export class FollowModule { }