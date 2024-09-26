import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { AuthService } from './auth.service';
import { User } from 'src/user/entities/user.entity';
import { LoginUserDto } from './dto/login-uset.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { StoreGmailInfoDto } from './dto/store-gmail-info.dto';


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

    @Get('confirm-email/:userId')
    async confirmEmail(@Param('userId') userId: string, @Res() res) {
        try {
            const result = await this.authService.confirmEmail(userId);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: error.message,
            });
        }
    }

    @Post('login')
    @UsePipes(ValidationPipe)
    async login(
        @Body() loginUserDto: LoginUserDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<any> {
        return this.authService.login(loginUserDto, res);
    }

    @Post('refresh-token')
    async refreshToken(@Body('refresh_token') refreshToken: string) {
        return this.authService.refreshAccessToken(refreshToken);
    }

    @Post('store-refresh-token')
    @UsePipes(ValidationPipe)  // Áp dụng ValidationPipe
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                refresh_token: { type: 'string', example: 'your_refresh_token_here' },
            },
        },
    })
    async storeRefreshToken(
        @Body('refresh_token') refresh_token: string,
        @Res({ passthrough: true }) res: Response  // Sử dụng passthrough để xử lý cookie mà vẫn trả về JSON
    ): Promise<{ message: string }> {
        return this.authService.storeRefreshToken(refresh_token, res);
    }

    @Post('reset-password')
    @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string', example: 'user@example.com' } } } })
    async resetPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto;

        if (!email) {
            throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
        }
        return await this.authService.resetPassword(email);
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

    @Post('store-GG-Info')
    async StoreGGinfo(
        @Body() storeGmailInfoDto: StoreGmailInfoDto
    ): Promise<User> {
        return this.authService.storeGGinfo(storeGmailInfoDto)
    }
}