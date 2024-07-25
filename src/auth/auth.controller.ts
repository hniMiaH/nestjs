import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { AuthService } from './auth.service';
import { User } from 'src/user/entities/user.entity';
import { LoginUserDto } from './dto/login-uset.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(
        @Body() registerUserDto: RegisterUserDto
    ): Promise<User> {
        return this.authService.register(registerUserDto)
    }

    @Post('login')
    @UsePipes(ValidationPipe)
    async login(
        @Body() loginUserDto: LoginUserDto
    ): Promise<any> {
        return this.authService.login(loginUserDto)
    }

    @Post('refresh-token')
    async refreshToken(
        @Body() { refresh_token }
    ): Promise<any> {
        return this.authService.refreshToken(refresh_token)
    }

}