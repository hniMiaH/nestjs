import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserService } from '../user/user.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { MessageEntity } from './entities/message.entity';
import { MessageStatus } from 'src/const';

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

    async createMessage(createMessageDto: CreateMessageDto, senderId: string): Promise<any> {
        const { receiverId, content } = createMessageDto;

        const receiver = await this.findById(receiverId);
        const sender = await this.findById(senderId);

        if (!receiver) {
            throw new NotFoundException('Người nhận không tồn tại.');
        }

        const message = this.messageRepository.create({
            sender: sender,
            receiver: receiver,
            content: content,
            status: MessageStatus.SENT,
        });

        return await this.messageRepository.save(message);
    }

    async updateMessageStatus(messageId: string, status: MessageStatus): Promise<MessageEntity> {
        const message = await this.messageRepository.findOne({ where: { id: messageId } });

        if (!message) {
            throw new NotFoundException('The message is not existed');
        }

        message.status = status;
        return await this.messageRepository.save(message);
    }
}
