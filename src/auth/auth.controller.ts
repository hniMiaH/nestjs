import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { AuthService } from './auth.service';
import { User } from 'src/user/entities/user.entity';
import { LoginUserDto } from './dto/login-uset.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
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

    @Post('send-otp')
    @ApiOperation({ summary: 'Gửi OTP đến email' })
    @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string', example: 'user@example.com' } } } })
    async sendOtp(
        @Body('email') email: string
    ): Promise<any> {
        const otp = await this.authService.sendOtpToEmail(email);
        return { message: 'OTP has been sent to your email.', otp };
    }
    @Post('forgot-password')
    async forgotPassword(@Body() email: string) {
        return this.authService.forgotPassword(email);
    }

    @Post('reset-password')
    async resetPassword(@Body() resetPasswordDto: { email: string; newPassword: string }) {
        return this.authService.resetPassword(resetPasswordDto.email, resetPasswordDto.newPassword);
    }

    @Post('verify-otp')
    @ApiOperation({ summary: 'Xác thực OTP' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'user@example.com' },
                otp: { type: 'string', example: '123456' }
            }
        }
    })
    async verifyOtp(
        @Body() { email, otp }: { email: string, otp: string }
    ): Promise<any> {
        return this.authService.verifyOtp(email, otp);
    }
}