import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RegisterUserDto } from 'src/user/dto/register-user.dto';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
@ApiBearerAuth()
@ApiTags('user')
@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private userService: UserService) { }

  @Get('get-all-users')
  async findAll(
    @Query() params: PageOptionsDto,
  ) {
    return this.userService.getAllUser(params);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string
  ) {
    return this.userService.getUserById(id);
  }

  @Post('create-user')
  async createUser(
    @Body() registerUserDto: RegisterUserDto
  ): Promise<UserEntity> {
    return this.userService.createUser(registerUserDto)
  }

  @Put('update-inform')
  async updateLoggedInUser(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateLoggedInUser(updateUserDto, req);
  }

  @Delete('/delete-user/:id')
  async deleteUser(
    @Param('id') id: string
  ) {
    return this.userService.deleteUser(id)
  }

  @Post('update-avatar')
  @UseGuards(AuthGuard)
  @ApiBody({
    description: 'Avatar image upload',
    required: false,
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          nullable: true,
        }
      },
    }
  })
  async uploadAvatar(
    @Req() req: Request,
    @Body('avatar') avatar: string,
  ): Promise<any> {
    const currentUserId = req['user_data'].id

    await this.userService.updateAvatar(currentUserId, avatar);
    return {
      message: 'Avatar updated successfully',
      avatar: avatar
    }
  }


  @Put('update-password')
  @ApiBody({ type: UpdatePasswordDto })
  async updatePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
    @Req() request: Request,
  ) {
    return await this.userService.updatePasswordForLoggedInUser(updatePasswordDto, request);
  }

  @Get('check-username/:username')
  async checkUsername(
    @Param('username') username: string,
    @Req() request: Request,
  ) {
    const encodedUsername = decodeURIComponent(username);
    console.log(encodedUsername)
    return this.userService.checkUsername(encodedUsername, request)
  }

}