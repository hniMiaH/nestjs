import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RegisterUserDto } from 'src/user/dto/register-user.dto';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { storageConfig } from 'helpers/config';
import { extname } from 'path';
import { StoreGmailInfoDto } from 'src/auth/dto/store-gmail-info.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { fileFilter } from 'uploads/avatar/upload.config';
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
  @UseInterceptors(FileInterceptor('avatar', {
    storage: storageConfig('avatar'),
    fileFilter: fileFilter,
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image upload',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    console.log(file)
    if (req.fileValidationError) {
      throw new HttpException("Image is too large to upload", HttpStatus.BAD_REQUEST)
    }
    if (!file) {
      throw new HttpException("Image is required", HttpStatus.BAD_REQUEST);
    }
    this.userService.updateAvatar(req.user_data.id, file.destination + '/' + file.filename)
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
    return this.userService.checkUsername(username, request)
  }

}