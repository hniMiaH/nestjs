import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RegisterUserDto } from 'src/user/dto/register-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { storageConfig } from 'helpers/config';
import { extname } from 'path';
@ApiBearerAuth()

@ApiTags('user')
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

  @Post('updateAvatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: storageConfig('avatar'),
    fileFilter: (req, file, cb) => {
      const ext = extname(file.originalname);
      const allowedExtArr = ['.jpg', '.png', '.jpeg']
      if (!allowedExtArr.includes(ext)) {
        req.fileValidationError = `Wrong extension type. Accepted files ext are: ${allowedExtArr.toString()}`
        cb(null, false)
      } else {
        const fileSize = parseInt(req.headers['Content-Length'])
        if (fileSize > 1024 * 1024 * 5) {
          req.fileValidationError = 'file is too large';
          cb(null, false);
        } else {
          cb(null, true)
        }
      }
    }
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
}