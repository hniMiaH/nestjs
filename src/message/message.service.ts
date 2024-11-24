import { Injectable, NotFoundException } from "@nestjs/common";
import { MessageStatus } from "src/const";
import { MessageEntity } from "./entities/message.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "src/user/entities/user.entity";
import { CreateMessageDto } from "./dto/create-message.dto";
import * as moment from "moment";
import { PageDto, PageMetaDto, PageOptionsDto } from "src/common/dto/pagnition.dto";
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

    async createConversation(receiverId: string, req: Request): Promise<any> {

        const senderId = req['user_data'].id;
        const sender = await this.findById(senderId);
        const receiver = await this.findById(receiverId);

        if (!receiver) {
            throw new NotFoundException('Receiver does not exist');
        }

        const existingMessages = await this.messageRepository.findOne({
            where: [
                { sender: { id: senderId }, receiver: { id: receiverId } },
                { sender: { id: receiverId }, receiver: { id: senderId } }
            ],
        });

        if (existingMessages) {
            return {
                message: 'Conversation already exists',
            };
        }

        const welcomeMessage = this.messageRepository.create({
            sender,
            receiver,
            content: null,
            status: MessageStatus.SENT,
        });

        await this.messageRepository.save(welcomeMessage);

        return {
            message: 'Conversation created successfully',
            welcomeMessageId: welcomeMessage.id,
        };
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

    async getConversation(
        userId1: string,
        userId2: string,
        params: PageOptionsDto
    ): Promise<PageDto<any>> {
        const [messages, totalMessages] = await this.messageRepository.findAndCount({
            where: [
                { sender: { id: userId1 }, receiver: { id: userId2 } },
                { sender: { id: userId2 }, receiver: { id: userId1 } }
            ],
            order: {
                createdAt: 'DESC'
            },
            relations: ['sender', 'receiver'],
            skip: params.skip,
            take: params.pageSize,
        });

        const transformedMessages = messages.map(message => {
            const createdAt = moment(message.createdAt).subtract(7, 'hours');
            const now = moment();

            const diffMinutes = now.diff(createdAt, 'minutes');
            const diffHours = now.diff(createdAt, 'hours');
            const diffDays = now.diff(createdAt, 'days');
            const diffMonths = now.diff(createdAt, 'months');

            let createdAgo: string;

            if (diffMinutes === 0) {
                createdAgo = "Just now";
            } else if (diffMinutes < 60) {
                createdAgo = `${diffMinutes}m ago`;
            } else if (diffHours < 24) {
                createdAgo = `${diffHours}h ago`;
            } else if (diffMonths < 1) {
                createdAgo = `${diffDays}d ago`;
            } else {
                createdAgo = createdAt.format('MMM D');
            }

            return {
                id: message.id,
                content: message.content,
                status: message.status,
                created_at: moment(message.createdAt)
                    .subtract(7, 'hours')
                    .format('HH:mm DD-MM-YYYY'),
                created_ago: createdAgo,
                sender: {
                    id: message.sender.id,
                    userName: message.sender.username,
                    fullName: `${message.sender.firstName} ${message.sender.lastName}`,
                    avatar: message.sender.avatar
                },
            };
        });

        return new PageDto(
            transformedMessages,
            new PageMetaDto({
                itemCount: totalMessages,
                pageOptionsDto: params,
            })
        );
    }

    async getAllConversationsOfUser(
        params: PageOptionsDto,
        userId: string
    ): Promise<any> {
        const queryBuilder = this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .leftJoinAndSelect('message.receiver', 'receiver')
            .where('message.senderId = :userId OR message.receiverId = :userId', { userId })
            .orderBy('message.createdAt', 'DESC');

        const allMessages = await queryBuilder.getMany();

        const conversations = new Map<string, any>();

        allMessages.forEach(message => {
            const otherUser = message.sender.id === userId ? message.receiver : message.sender;
            if (!conversations.has(otherUser.id)) {
                conversations.set(otherUser.id, {
                    user: {
                        id: otherUser.id,
                        userName: otherUser.username,
                        fullName: `${otherUser.firstName} ${otherUser.lastName}`,
                        avatar: otherUser.avatar,
                    },
                    lastMessage: null,
                });
            }

            if (!conversations.get(otherUser.id).lastMessage) {
                const createdAt = moment(message.createdAt).subtract(7, 'hours');
                const now = moment();

                const diffMinutes = now.diff(createdAt, 'minutes');
                const diffHours = now.diff(createdAt, 'hours');
                const diffDays = now.diff(createdAt, 'days');
                const diffMonths = now.diff(createdAt, 'months');

                let createdAgo: string;

                if (diffMinutes === 0) {
                    createdAgo = "Just now";
                } else if (diffMinutes < 60) {
                    createdAgo = `${diffMinutes}m ago`;
                } else if (diffHours < 24) {
                    createdAgo = `${diffHours}h ago`;
                } else if (diffMonths < 1) {
                    createdAgo = `${diffDays}d ago`;
                } else {
                    createdAgo = createdAt.format('MMM D');
                }

                conversations.get(otherUser.id).lastMessage = {
                    id: message.id,
                    content: message.content,
                    status: message.status,
                    created_at: createdAt.format('HH:mm DD-MM-YYYY'),
                    created_ago: createdAgo,
                    created_by: {
                        id: message.sender.id,
                        userName: message.sender.username,
                        fullName: `${message.sender.firstName} ${message.sender.lastName}`,
                        avatar: message.sender.avatar,
                    }
                };
            }
        });

        const allConversations = Array.from(conversations.values());
        const totalConversations = allConversations.length;

        const paginatedConversations = allConversations.slice(params.skip, params.skip + params.pageSize);

        return new PageDto(
            paginatedConversations,
            new PageMetaDto({
                itemCount: totalConversations,
                pageOptionsDto: params,
            })
        );
    }

}
