import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterUserDto } from 'src/user/dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async getAllUser(): Promise<User[]> {
    return await this.userRepository.find();
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
}