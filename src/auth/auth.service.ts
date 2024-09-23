import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-uset.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';



@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async register(registerUserDto: RegisterUserDto): Promise<any> {
        const existingEmail = await this.userRepository.findOne({ where: { email: registerUserDto.email } });
        const existingUser = await this.userRepository.findOne({ where: { username: registerUserDto.username } });

        if (existingUser) {
            throw new HttpException('Username đã được đăng ký', HttpStatus.BAD_REQUEST);
        }
        if (existingEmail) {
            throw new HttpException('Email đã được đăng ký', HttpStatus.BAD_REQUEST);
        }

        if (registerUserDto.password !== registerUserDto.confirmPassword) {
            throw new HttpException('Mật khẩu và xác nhận mật khẩu không khớp', HttpStatus.BAD_REQUEST);
        }

        const hashPassword = await this.hashPassword(registerUserDto.password);
        const user = this.userRepository.create({ ...registerUserDto, password: hashPassword });

        const savedUser = await this.userRepository.save(user);

        const otp = await this.sendOtpToEmail(registerUserDto.email);
        return { message: "OTP đã được gửi, vui lòng kiểm tra email" }; // Bạn có thể bỏ otp khỏi response để bảo mật
    }

    async login(loginUserDto: LoginUserDto): Promise<any> {
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
            throw new HttpException("User is not verified. Please verify your account before logging in.", HttpStatus.UNAUTHORIZED);
        }

        if (!user) {
            throw new HttpException("User is not exsited", HttpStatus.UNAUTHORIZED)
        }
        const checkPass = bcrypt.compareSync(loginUserDto.password, user.password);
        if (!checkPass) {
            throw new HttpException("Password is not correct", HttpStatus.UNAUTHORIZED)
        }

        const payload = { id: user.id, email: user.email }
        return this.generateToken(payload)
    }

    private async generateToken(payload: { id: number, email: string }) {
        const access_token = await this.jwtService.signAsync(payload)
        const refresh_token = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>('SECRET'),
            expiresIn: '1h'
        })
        await this.userRepository.update(
            { email: payload.email },
            { refresh_token: refresh_token },
        )
        const user = await this.userRepository.findOne({ where: { email: payload.email } });

        const { password, refresh_token: rt, otp, otpExpiration, ...userInfo } = user;

        // Trả về access token và thông tin người dùng
        return { access_token, user: userInfo };
    }

    async refreshToken(refresh_token: string) {
        try {
            const payload = await this.jwtService.verifyAsync(refresh_token, {
                secret: this.configService.get<string>('SECRET'),
            })

            let queryBuilder = await this.userRepository
                .createQueryBuilder('user')
                .where('user.email = :email', { email: payload.email })
                .getOne();

            if (queryBuilder) {
                return this.generateToken({ id: payload.id, email: payload.email })
            }
            else {
                throw new HttpException("Refresh token is not valid", HttpStatus.BAD_REQUEST)
            }
        }
        catch (error) {
            throw new HttpException("Refresh token is not valid", HttpStatus.BAD_REQUEST)
        }
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

        // Lưu OTP vào cơ sở dữ liệu cùng với người dùng
        await this.userRepository.update({ email }, { otp });

        return otp;
    }

    async forgotPassword(email: string): Promise<any> {
        const user = await this.userRepository.findOne({ where: { email: email } });

        if (!user) {
            throw new HttpException("Email does not exist", HttpStatus.BAD_REQUEST);
        }

        const otp = await this.sendOtpToEmail(email);
        // Store OTP and its expiration time in the user record
        user.otp = otp;
        user.otpExpiration = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
        await this.userRepository.save(user);

        return { message: "OTP has been sent to your email, please check your inbox." };
    }

    async resetPassword(email: string, newPassword: string): Promise<any> {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new HttpException("User not found", HttpStatus.BAD_REQUEST);
        }

        const hashPassword = await this.hashPassword(newPassword);
        user.password = hashPassword;
        user.otpExpiration = null; // Clear OTP expiration
        await this.userRepository.save(user);

        return { message: "Password has been successfully reset." };
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

} 
