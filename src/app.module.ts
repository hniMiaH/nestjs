import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from 'db/data-source';
import { PostController } from './post/post.controller';
import { PostModule } from './post/post.module';
import { CommonController } from './common/common.controller';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    UserModule,
    AuthModule,
    PostModule,
    ConfigModule.forRoot(),
    CommonModule
  ],
  controllers: [AppController, CommonController],
  providers: [AppService],
})
export class AppModule { }
