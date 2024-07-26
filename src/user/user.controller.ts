import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RegisterUserDto } from 'src/user/dto/register-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';

@ApiTags('user')
@ApiBearerAuth('JWT-auth')
@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private userService: UserService) { }

  @Get('allUsers')
  async findAll(
    @Query() params: PageOptionsDto,
  ) {
    return this.userService.getAllUser(params);
  }

  @Get(':id')
  async findById(
    @Param('id') id: number
  ) {
    return this.userService.getUserById(id);
  }

  @Post('createUser')
  async createUser(
    @Body() registerUserDto: RegisterUserDto
  ): Promise<User> {
    return this.userService.createUser(registerUserDto)
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.userService.updateUser(id, updateUserDto)
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: number
  ) {
    return this.userService.deleteUser(id)
  }
}