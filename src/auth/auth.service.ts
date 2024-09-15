import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-uset.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async register(registerUserDto: RegisterUserDto): Promise<User> {

        const hashPassword = await this.hashPassword(registerUserDto.password);
        return await this.userRepository.save({ ...registerUserDto, refresh_token: "hehehe", password: hashPassword });
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
            expiresIn: '122222h'
        })
        await this.userRepository.update(
            { email: payload.email },
            { refresh_token: refresh_token },
        )
        return { access_token, refresh_token }
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


    private async hashPassword(password: string): Promise<string> {
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound)
        const hash = await bcrypt.hash(password, salt);
        return hash;
    }

    async towerHaNoi(n: number, a, b, c: string) {
        if (n == 1) console.log(a + "to" + c)
        else {
            this.towerHaNoi(n - 1, a, c, b)
            this.towerHaNoi(1, a, b, c)
            this.towerHaNoi(n - 1, b, a, c)
        }
    }
} 
