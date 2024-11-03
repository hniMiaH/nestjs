import { Injectable, NotFoundException } from "@nestjs/common";
import { MessageStatus } from "src/const";
import { MessageEntity } from "./entities/message.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "src/user/entities/user.entity";
import { CreateMessageDto } from "./dto/create-message.dto";

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
        if (!user) throw new NotFoundException(`User with ID ${id} doesn't exist`);
        return user;
    }

    async createMessage(createMessageDto: CreateMessageDto, senderId: string): Promise<any> {
        const { receiverId, content } = createMessageDto;
        const receiver = await this.findById(receiverId);
        const sender = await this.findById(senderId);

        if (!receiver) {
            throw new NotFoundException('User does not exist');
        }

        const message = this.messageRepository.create({
            sender: sender,
            receiver: receiver,
            content: content,
            status: MessageStatus.SENT,
        });
        const result = {
            id: message.id,
            content: message.content,
            status: message.status,
            createdAt: message.createdAt,
            sender: {
                id: message.sender.id,
                userName: message.sender.username,
                fullName: `${message.sender.firstName} ${message.sender.lastName}`,
                avatar: message.sender.avatar
            },
            receiver: {
                id: message.receiver.id,
                userName: message.receiver.username,
                fullName: `${message.receiver.firstName} ${message.receiver.lastName}`,
                avatar: message.receiver.avatar
            }
        }
        await this.messageRepository.save(message);
        return result;
    }

    async removeMessage(messageId: string, userId: string): Promise<any> {
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
            relations: ["sender", "receiver"],
        });

        if (!message) throw new NotFoundException('Message does not exist');

        if (message.sender.id !== userId && message.receiver.id !== userId) {
            throw new NotFoundException('You do not have permission to delete this message');
        }

        await this.messageRepository.remove(message);
        return 'Message is removed successfully';

    }

    async updateMessageStatus(messageId: string, status: MessageStatus): Promise<MessageEntity> {
        const message = await this.messageRepository.findOne({ where: { id: messageId } });
        if (!message) throw new NotFoundException('Message is not existed');
        message.status = status;
        return await this.messageRepository.save(message);
    }

    async getConversation(userId1: string, userId2: string): Promise<any[]> {
        const messages = await this.messageRepository.find({
            where: [
                { sender: { id: userId1 }, receiver: { id: userId2 } },
                { sender: { id: userId2 }, receiver: { id: userId1 } }
            ],
            order: {
                createdAt: 'ASC'
            },
            relations: ['sender', 'receiver']
        });

        return messages.map(message => ({
            id: message.id,
            content: message.content,
            status: message.status,
            createdAt: message.createdAt,
            sender: {
                id: message.sender.id,
                userName: message.sender.username,
                fullName: `${message.sender.firstName} ${message.sender.lastName}`,
                avatar: message.sender.avatar
            },
        }));
    }
}
