import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterUserDto } from 'src/user/dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageDto, PageMetaDto, PageOptionsDto } from 'src/common/dto/pagnition.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,  // Inject JwtService để giải mã token

  ) { }
  async updateLoggedInUser(payload: UpdateUserDto, request: Request): Promise<any> {
    const userId = request['user_data'].id; // Lấy userId từ request

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    await this.userRepository.update(userId, payload);
    return { message: 'User information updated successfully' };
}
  
  async transformEntity(entity: User): Promise<any> {
    // Transform the entity to the desired model
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

  async getUserById(id: number): Promise<User> {
    return await this.userRepository.findOneBy({ id });
  }

  async createUser(payload: RegisterUserDto): Promise<User> {
    const password = await bcrypt.hash(payload.password, 10);
    return await this.userRepository.save(payload);
  }

  async updateUser(id: number, payload: UpdateUserDto): Promise<UpdateResult> {
    return await this.userRepository.update(id, payload);
  }

  async deleteUser(id: number): Promise<DeleteResult> {
    return await this.userRepository.delete(id);
  }

  async updateAvatar(id: number, avatar: string): Promise<UpdateResult> {
    return await this.userRepository.update(id, { avatar })
  }
}