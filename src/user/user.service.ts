import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, In, Repository, UpdateResult } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RegisterUserDto } from 'src/user/dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { JwtService } from '@nestjs/jwt';
import { StoreGmailInfoDto } from 'src/auth/dto/store-gmail-info.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { MessageEntity } from 'src/message/entities/message.entity';
import { PostEntity } from 'src/post/entities/post.entity';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { DateTime } from 'luxon';
import { UserGateway } from './user.gateway';
import { NotificationEntity } from 'src/notification/entities/notification.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,

    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,

    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,

    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,

    @InjectRepository(ReactionEntity)
    private readonly reactionRepository: Repository<ReactionEntity>,

    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>

  ) { }

  async updateLoggedInUser(payload: UpdateUserDto, request: Request): Promise<any> {
    const userId = request['user_data'].id;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    await this.userRepository.update(userId, payload);
    const updatedUser = await this.userRepository.findOne({ where: { id: userId } });

    const formattedDob = updatedUser.dob
      ? `Born ${DateTime.fromJSDate(updatedUser.dob).toFormat('MMMM d, yyyy')}`
      : null;

    return {
      message: 'User information updated successfully',
      data: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        gender: updatedUser.gender,
        dob: formattedDob,
      },
    };
  }
  async transformEntity(entity: UserEntity): Promise<any> {
    return {
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      email: entity.email,
      createdAt: entity.created_at,
      avatar: entity.avatar
    };
  }

  async getAllUser(params: PageOptionsDto, userId?: number): Promise<any> {

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC')  // Correct usage of orderBy with DESC
      .skip(params.skip)
      .take(params.pageSize);

    const [entities, itemCount] = await queryBuilder.getManyAndCount();

    // Map the results
    const transformedEntities = await Promise.all(entities.map(this.transformEntity));
    const data = new PageDto(
      transformedEntities,
      new PageMetaDto({ itemCount, pageOptionsDto: params }),
    );
    return data;
  }

  async getUserById(id: string): Promise<any> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
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
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async createUser(payload: RegisterUserDto): Promise<UserEntity> {
    const password = await bcrypt.hash(payload.password, 10);
    return await this.userRepository.save(payload);
  }

  async updateUser(id: number, payload: UpdateUserDto): Promise<UpdateResult> {
    return await this.userRepository.update(id, payload);
  }

  async deleteUser(id: string): Promise<any> {
    await this.notificationRepository.delete({ sender: { id } });

    await this.notificationRepository.delete({ receiver: { id } });
   
    await this.reactionRepository.delete({ user: { id } });

    await this.commentRepository.delete({ created_by: { id } });

    await this.postRepository.delete({ created_by: { id } });

    await this.messageRepository.delete({ sender: { id } });

    await this.messageRepository.delete({ receiver: { id } });

    await this.userRepository.delete(id);

    return { message: 'User and related data deleted successfully' };
  }


  async updateAvatar(id: number, avatar: string): Promise<any> {
    return await this.userRepository.update(id, { avatar })
  }

  async updatePasswordForLoggedInUser(
    updatePasswordDto: UpdatePasswordDto,
    request: Request,
  ): Promise<any> {
    const userId = request['user_data'].id;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const isPasswordValid = await bcrypt.compare(updatePasswordDto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpException('Current password is incorrect', HttpStatus.BAD_REQUEST);
    }
    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);

    await this.userRepository.update(userId, { password: hashedPassword });

    return { message: 'Password updated successfully' };
  }

  async checkUsername(username: string, req: Request): Promise<any> {
    const currentUserId = req['user_data'].id
    if (!username) {
      return { message: 'Username is required' };
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username })
      .getOne();


    if (!user) {
      return { checkUsername: false, message: 'User does not exist' };
    }

    if (user.status == 0) {
      return {
        checkUsername: false,
        message: 'User is not verified. Please verify your account before accessing.'
      };
    }

    const followerCount = user.followers ? user.followers.length : 0;
    const followingCount = user.followings ? user.followings.length : 0;

    const postCount = await this.postRepository
      .createQueryBuilder('post')
      .where('post.created_by = :userId', { userId: user.id })
      .getCount();

    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserId }
    });

    let isFollowing = "follow";

    if (currentUser?.followings?.includes(user.id)) {
      isFollowing = "following";
    }
    if (
      user.followings?.includes(currentUserId) && !currentUser?.followings?.includes(user.id)
    ) {
      isFollowing = "follow back";
    }
    if (
      user.followings?.includes(currentUserId) && currentUser?.followings?.includes(user.id)
    ) {
      isFollowing = "friend";
    }

    return {
      checkUsername: true,
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
        isFollow: isFollowing,
        followers: followerCount,
        followings: followingCount,
        postCount: postCount
      }
    };
  }

  async findUsersByIds(userIds: string[]): Promise<any[]> {
    return await this.userRepository.find({
      where: {
        id: In(userIds),
      },
      select: ['id', 'username', 'firstName', 'lastName', 'avatar'],
    });
  }
}