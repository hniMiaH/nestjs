import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserService } from '../user/user.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { MessageEntity } from './entities/message.entity';

@Injectable()
export class MessageService {
    constructor(
        @InjectRepository(MessageEntity)
        private messageRepository: Repository<MessageEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,

    ) { }

    async findById(id: string): Promise<UserEntity> {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
        }

        return user;
    }

    async createMessage(createMessageDto: CreateMessageDto, request: Request): Promise<MessageEntity> {
        const senderId = request['user_data'].id;

        const { receiverId, content } = createMessageDto;
        const receiver = await this.findById(receiverId);

        if (!receiver) {
            throw new NotFoundException('The receiver is not found.');
        }

        const message = this.messageRepository.create({
            sender: senderId,
            receiver,
            content,
        });

        return await this.messageRepository.save(message);
    }
}
