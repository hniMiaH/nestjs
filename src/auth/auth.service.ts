import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-uset.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Response } from 'express';
import * as cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { StoreGmailInfoDto } from './dto/store-gmail-info.dto';


@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async register(registerUserDto: RegisterUserDto): Promise<any> {
        const existingEmail = await this.userRepository.findOne({ where: { email: registerUserDto.email } });
        const existingUser = await this.userRepository.findOne({ where: { username: registerUserDto.username } });

        if (existingUser) {
            throw new HttpException('Username was used', HttpStatus.BAD_REQUEST);
        }
        if (existingEmail) {
            throw new HttpException('Email was used', HttpStatus.BAD_REQUEST);
        }

        if (registerUserDto.password !== registerUserDto.confirmPassword) {
            throw new HttpException('Password and confirm password is not same', HttpStatus.BAD_REQUEST);
        }

        const hashPassword = await this.hashPassword(registerUserDto.password);
        const user = this.userRepository.create({ ...registerUserDto, password: hashPassword });

        const savedUser = await this.userRepository.save(user);
        await this.sendConfirmationEmail(registerUserDto.email, savedUser.id);

        return {
            user: {
                email: savedUser.email,
                username: savedUser.username,
            }
            , message: "Registration successful, please check your email to verify your account."
        };

    }
    async sendConfirmationEmail(email: string, userId: string): Promise<void> {
        const confirmUrl = `http://localhost:5000/verify/${userId}`;
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get<string>('GMAIL_USER'),
                pass: this.configService.get<string>('GMAIL_PASS'),
            },
        });

        const mailOptions = {
            from: this.configService.get<string>('GMAIL_USER'),
            to: email,
            subject: 'Confirm Your Account Registration',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px; background-color: #f9f9f9;">
                <h2 style="text-align: center; color: #333;">Welcome to Our Platform!</h2>
                <p style="text-align: center; font-size: 16px; color: #555;">
                  We're excited to have you on board! Please confirm your email address by clicking the button below.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${confirmUrl}" style="background-color: #FF8C00; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-size: 16px;">Confirm Account</a>
                </div>
                <p style="text-align: center; font-size: 14px; color: #888; margin-top: 20px;">
                  If you didn't create an account, please ignore this email.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                  <img src="https://example.com/logo.png" alt="Company Logo" style="width: 100px;">
                </div>
                <p style="text-align: center; font-size: 12px; color: #aaa; margin-top: 20px;">
                  &copy; 2024 Our Company. All rights reserved.
                </p>
              </div>
            `,
        };

        await transporter.sendMail(mailOptions);
    }

    async confirmEmail(userId: string): Promise<any> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new HttpException("User not found", HttpStatus.BAD_REQUEST);
        }

        if (user.status === 1) {
            return { message: "Account was verified before" };
        }

        user.status = 1;
        await this.userRepository.save(user);

        const token = jwt.sign({ id: user.id, email: user.email }, 'haiminhdeptrai', { expiresIn: '15m' });

        return { message: "Account was verified successfully!", token };
    }

    async login(loginUserDto: LoginUserDto, res: Response): Promise<any> {
        let user;

        if (loginUserDto.username.includes('@')) {
            user = await this.userRepository.findOne({
                where: { email: loginUserDto.username }
            });
        } else {
            user = await this.userRepository.findOne({
                where: { username: loginUserDto.username }
            });
        }
        if (!user) {
            throw new HttpException("User does not exist", HttpStatus.UNAUTHORIZED);
        }

        if (user.status == 0) {
            throw new HttpException("User is not verified. Please verify your account before logging in.", HttpStatus.BAD_REQUEST);
        }

        if (!user) {
            throw new HttpException("User is not exsited", HttpStatus.BAD_REQUEST)
        }
        const checkPass = bcrypt.compareSync(loginUserDto.password, user.password);
        if (!checkPass) {
            throw new HttpException("Password is not correct", HttpStatus.BAD_REQUEST)
        }

        const payload = { id: user.id, email: user.email }
        return this.generateToken(payload, res);
    }

    private async generateToken(payload: { id: number, email: string }, res: Response) {
        const access_token = await this.jwtService.signAsync(payload, {
            expiresIn: '15m' // Set expiration to 15 minutes
        });
        const refresh_token = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>('SECRET'),
            expiresIn: '7d'
        })

        await this.userRepository.update(
            { email: payload.email },
            { refresh_token: refresh_token },
        )

        const user = await this.userRepository.findOne({ where: { email: payload.email } });

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const { password, refresh_token: rt, otp, otpExpiration, ...userInfo } = user;

        return { token: { access_token, exp_token: "15m" }, user: userInfo };
    }

    async refreshAccessToken(refreshToken: string): Promise<any> {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('SECRET'),
            });

            // Tìm người dùng dựa trên email từ payload
            const user = await this.userRepository.findOne({ where: { email: payload.email } });

            if (!user) {
                throw new HttpException("User does not exist", HttpStatus.UNAUTHORIZED);
            }

            // Tạo access token mới
            const newAccessToken = await this.jwtService.signAsync({ id: user.id, email: user.email });

            return {
                access_token: newAccessToken,
            };
        } catch (error) {
            throw new HttpException("Refresh token is not valid", HttpStatus.UNAUTHORIZED);
        }
    }

    async storeRefreshToken(refresh_token: string, res: Response) {
        const decoded = await this.jwtService.verifyAsync(refresh_token, {
            secret: this.configService.get<string>('SECRET'),
        });

        const user = await this.userRepository.findOne({ where: { id: decoded.id } });

        if (!user) {
            throw new Error('User not found');
        }

        await this.userRepository.update(
            { id: decoded.id },
            { refresh_token: refresh_token },
        );

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { message: 'Refresh token stored successfully' };
    }

    async sendOtpToEmail(email: string): Promise<string> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Tạo mã OTP 6 chữ số
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get<string>('GMAIL_USER'),
                pass: this.configService.get<string>('GMAIL_PASS'),
            },
        });

        const mailOptions = {
            from: this.configService.get<string>('GMAIL_USER'),
            to: email,
            subject: 'Mã OTP của bạn',
            text: `Mã OTP của bạn là: ${otp}`,
        };

        await transporter.sendMail(mailOptions);

        await this.userRepository.update({ email }, { otp });

        return otp;
    }



    async resetPassword(email: string): Promise<any> {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new HttpException("User not found", HttpStatus.BAD_REQUEST);
        }

        const newPassword = Math.random().toString(36).slice(-6);

        await this.sendNewPasswordToEmail(email, newPassword);

        const hashPassword = await this.hashPassword(newPassword);

        user.password = hashPassword;
        user.otpExpiration = null;
        await this.userRepository.save(user);

        return { message: "A new password has been sent to your email." };
    }

    async sendNewPasswordToEmail(email: string, newPassword: string): Promise<void> {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get<string>('GMAIL_USER'),
                pass: this.configService.get<string>('GMAIL_PASS'),
            },
        });

        const mailOptions = {
            from: this.configService.get<string>('GMAIL_USER'),
            to: email,
            subject: 'Your New Password',
            text: `Your new password is: ${newPassword}`,
        };

        await transporter.sendMail(mailOptions);
    }

    private async hashPassword(password: string): Promise<string> {
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound)
        const hash = await bcrypt.hash(password, salt);
        return hash;
    }

    async verifyOtp(email: string, otp: string): Promise<any> {
        // Tìm người dùng dựa trên email và otp
        const user = await this.userRepository.findOne({ where: { email, otp } });

        if (!user) {
            throw new HttpException('Mã OTP không hợp lệ', HttpStatus.BAD_REQUEST);
        }

        user.status = 1;
        user.otp = null; // Xóa OTP sau khi xác thực thành công
        await this.userRepository.save(user);

        return { message: 'Tài khoản đã được xác thực thành công' };
    }

    async storeGGinfo(payload: StoreGmailInfoDto): Promise<UserEntity> {
        const existingUser = await this.userRepository.findOne({ where: { id: payload.id } });
        const existingEmail = await this.userRepository.findOne({ where: { email: payload.email } });
        if (existingEmail) {
            throw new HttpException("Email was registered", HttpStatus.UNAUTHORIZED);
        }
        if (existingUser) {
            return existingUser;
        } else {
            return await this.userRepository.save(payload);
        }
    }
} 
