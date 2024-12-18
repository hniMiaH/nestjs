import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PostEntity } from 'src/post/entities/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, PostEntity]),
    JwtModule.register({
      global: true,
      secret: 'haiminhdeptrai',
      signOptions: { expiresIn: '1h' }
    }),
    ConfigModule
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule { }
