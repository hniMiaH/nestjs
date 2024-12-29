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
import * as cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { StoreGmailInfoDto } from './dto/store-gmail-info.dto';
import { Request, Response } from 'express';
import axios from 'axios';
import { PostEntity } from 'src/post/entities/post.entity';
import { DateTime } from 'luxon';
import { LoginGGDto } from './dto/login-google.dto';
import * as dotenv from 'dotenv';
dotenv.config();
@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @InjectRepository(PostEntity)
        private postRepository: Repository<PostEntity>,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {

    }

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
                id: savedUser.id
            }
            , message: "Registration successful, please check your email to verify your account."
        };

    }
    async sendConfirmationEmail(email: string, userId: string): Promise<void> {
        const confirmUrl = `${process.env.URL_FE}/verify/${userId}`;
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
                </div>
                <p style="text-align: center; font-size: 12px; color: #aaa; margin-top: 20px;">
                  &copy; 2024 TalkTown Team. All rights reserved.
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

        else if (user.status === 0) {
            user.status = 1;
            await this.userRepository.save(user);
            const token = jwt.sign({ id: user.id, email: user.email }, 'haiminhdeptrai', { expiresIn: '15m' });

            return { message: "Account was verified successfully!", token };
        }

        throw new HttpException("Unexpected error", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    async login(loginUserDto: LoginUserDto, res: Response): Promise<any> {
        let user;

        if (loginUserDto.username.includes('@')) {
            user = await this.userRepository.findOne({
                where: { email: loginUserDto.username },
            });
        } else {
            user = await this.userRepository.findOne({
                where: { username: loginUserDto.username },
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

        const followerCount = user.followers ? user.followers.length : 0;
        const followingCount = user.followings ? user.followings.length : 0;

        const postCount = await this.postRepository
            .createQueryBuilder('post')
            .where('post.created_by = :userId', { userId: user.id })
            .getCount();
        const payload = { id: user.id, email: user.email }
        const token = await this.generateToken(payload, res);

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatar: user.avatar,
                gender: user.gender,
                dob: user.dob
                    ? `Born ${DateTime.fromJSDate(user.dob).toFormat('MMMM d, yyyy')}`
                    : null,
                created_at: user.created_at,
                updated_at: user.updated_at,
                followers: followerCount,
                followings: followingCount,
                postCount: postCount
            },

        };
    }

    private async generateToken(payload: { id: string, email: string }, res: Response) {
        const access_token = await this.jwtService.signAsync(payload, {
            expiresIn: '7d'
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
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
        });

        const { password, refresh_token: rt, otp, otpExpiration, ...userInfo } = user;

        return { token: access_token };
    }

    async refreshAccessToken(req: Request): Promise<any> {
        const refreshToken = req.cookies.refresh_token;
        console.log(refreshToken);
        const refreshTokenGmail = req.cookies.refresh_token_gmail;

        if (!refreshToken) {
            throw new HttpException("Refresh token not found in cookies", HttpStatus.UNAUTHORIZED);
        }
        if (refreshTokenGmail) {
            const data = new URLSearchParams();
            data.append('client_id', process.env.GOOGLE_CLIENT_ID);
            data.append('client_secret', process.env.GOOGLE_CLIENT_SECRET);
            data.append('refresh_token', refreshTokenGmail);
            data.append('grant_type', 'refresh_token');

            const response = await axios.post('https://oauth2.googleapis.com/token', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            return response.data.access_token;
        }
        else {
            try {
                const payload = await this.jwtService.verifyAsync(refreshToken, {
                    secret: this.configService.get<string>('SECRET'),
                });

                const user = await this.userRepository.findOne({ where: { email: payload.email } });

                if (!user) {
                    throw new HttpException("User does not exist", HttpStatus.UNAUTHORIZED);
                }

                const newAccessToken = await this.jwtService.signAsync({ id: user.id, email: user.email }, { expiresIn: '15m' });

                return {
                    access_token: newAccessToken,
                };
            } catch (error) {
                throw new HttpException("Refresh token is not valid", HttpStatus.UNAUTHORIZED);
            }
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
    }


    async sendOtpToEmail(email: string): Promise<string> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
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
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 20px auto;
                    background:rgb(234, 214, 177);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                ">
                    <div style="
                        background-color:rgb(226, 114, 17);
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                    ">
                        <h1 style="margin: 0; font-size: 24px;">TalkTown Back!</h1>
                    </div>
                    <div style="padding: 20px; color: #333333; line-height: 1.6;">
                        <p style ="text-align:center">Hello,</p>
                        <p style ="text-align:center">Your request for a new password has been processed. Please find your new password below:</p>
                        <p style="
                            font-size: 28px;
                            font-weight: bold;
                            color:rgb(255, 115, 0);
                            text-align: center;
                        ">${newPassword}</p>
                        <p>For security reasons, we recommend you change your password immediately after logging in.</p>
                        <p style="text-align: center;">Thank you,</p>
                        <p style="text-align: center;">TalkTown Team</p>
                    </div>
                    <div style="
                        background-color: #f4f4f4;
                        color: #888888;
                        text-align: center;
                        padding: 10px;
                        font-size: 12px;
                    ">
                        &copy; 2024 TalkTown Team. All rights reserved.
                    </div>
                </div>
            `,
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
        const user = await this.userRepository.findOne({ where: { email, otp } });

        if (!user) {
            throw new HttpException('Mã OTP không hợp lệ', HttpStatus.BAD_REQUEST);
        }

        user.status = 1;
        user.otp = null;
        await this.userRepository.save(user);

        return { message: 'Tài khoản đã được xác thực thành công' };
    }

    async storeGGinfo(payload: StoreGmailInfoDto, res: Response): Promise<UserEntity> {
        const existingUserById = await this.userRepository.findOne({ where: { id: payload.id } });
        const existingUserByEmail = await this.userRepository.findOne({ where: { email: payload.email } });

        if (existingUserById && existingUserByEmail) {
            res.cookie('refresh_token_gmail', payload.refresh_token, {
                httpOnly: true,
                secure: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            existingUserById.refresh_token = payload.refresh_token;
            return await this.userRepository.save(existingUserById);
        }

        if (existingUserByEmail && existingUserByEmail.id !== payload.id) {
            throw new HttpException("Email was registered", HttpStatus.BAD_REQUEST);
        }

        res.cookie('refresh_token_gmail', payload.refresh_token, {
            httpOnly: true,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const newUser = this.userRepository.create(payload);
        return await this.userRepository.save(newUser);
    }

    async loginGG(payload: LoginGGDto, res: Response): Promise<any> {
        const existingEmail = await this.userRepository.findOne({ where: { email: payload.email } });

        let user;

        if (existingEmail) {
            user = existingEmail;
        } else {
            const username = payload.email;
            const newUser = this.userRepository.create({
                username: username,
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
                avatar: payload.avatar,
                status: 1
            });
            await this.userRepository.save(newUser);
            user = newUser;
        }

        const followerCount = user.followers ? user.followers.length : 0;
        const followingCount = user.followings ? user.followings.length : 0;

        const postCount = await this.postRepository
            .createQueryBuilder('post')
            .where('post.created_by = :userId', { userId: user.id })
            .getCount();

        const a = { id: user.id, email: user.email };
        const token = await this.generateToken(a, res);

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatar: user.avatar,
                gender: user.gender,
                dob: user.dob
                    ? `Born ${DateTime.fromJSDate(user.dob).toFormat('MMMM d, yyyy')}`
                    : null,
                created_at: user.created_at,
                updated_at: user.updated_at,
                followers: followerCount,
                followings: followingCount,
                postCount: postCount,
            },
        };
    }
}
