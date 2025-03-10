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

        const conversation = await this.messageRepository.createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .leftJoinAndSelect('message.receiver', 'receiver')
            .where(
                `(
            (message.senderId = :senderId AND message.receiverId = :receiverId)
            OR
            (message.senderId = :receiverId AND message.receiverId = :senderId)
        )`,
                { senderId, receiverId }
            )
            .andWhere('message.content IS NULL')
            .getOne();

        if (conversation) {
            return {
                id: conversation.id,
                sender: {
                    id: conversation.sender.id,
                    username: conversation.sender.username,
                    fullName: `${conversation.sender.firstName} ${conversation.sender.lastName}`,
                    avatar: conversation.sender.avatar
                },
                receiver: {
                    id: conversation.receiver.id,
                    username: conversation.receiver.username,
                    fullName: `${conversation.receiver.firstName} ${conversation.receiver.lastName}`,
                    avatar: conversation.receiver.avatar
                },
            };
        }

        const welcomeMessage = this.messageRepository.create({
            sender,
            receiver,
            content: null,
            status: MessageStatus.SENT,
        });
        await this.messageRepository.save(welcomeMessage);

        const result = {
            id: welcomeMessage.id,
            sender: {
                id: welcomeMessage.sender.id,
                username: welcomeMessage.sender.username,
                fullName: `${welcomeMessage.sender.firstName} ${welcomeMessage.sender.lastName}`,
                avatar: welcomeMessage.sender.avatar
            },
            receiver: {
                id: welcomeMessage.receiver.id,
                username: welcomeMessage.receiver.username,
                fullName: `${welcomeMessage.receiver.firstName} ${welcomeMessage.receiver.lastName}`,
                avatar: welcomeMessage.receiver.avatar
            }
        }

        return result
    }

    async createMessage(createMessageDto: CreateMessageDto, senderId: string): Promise<any> {
        const { conversationId, content } = createMessageDto;

        const a = await this.messageRepository.findOne({
            where: {
                id: conversationId,
                content: null
            },
            relations: ['receiver', 'sender'],
        });

        if (!a) {
            throw new NotFoundException('Conversation not found');
        }

        const userId1 = a.receiver.id;
        const userId2 = a.sender.id;

        let receiverId

        if (userId1 == senderId) {
            receiverId = userId2
        }
        if (userId2 == senderId) {
            receiverId = userId1
        }

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
        await this.messageRepository.save(message);

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
            receiver: {
                id: message.receiver.id,
                username: message.receiver.username,
                fullName: `${message.receiver.firstName} ${message.receiver.lastName}`,
                avatar: message.receiver.avatar
            },
            idConversation: conversationId
        };
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
        conversationId: string,
        params: PageOptionsDto
    ): Promise<PageDto<any>> {
        const a = await this.messageRepository.findOne({
            where: {
                id: conversationId,
                content: null
            },
            relations: ['receiver', 'sender'],
        });

        if (!a) {
            throw new NotFoundException('Conversation not found');
        }

        const userId1 = a.receiver.id;
        const userId2 = a.sender.id;

        const [messages] = await this.messageRepository.findAndCount({
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

        const conversation = await this.messageRepository.createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .leftJoinAndSelect('message.receiver', 'receiver')
            .where(
                `(
                (message.senderId = :userId1 AND message.receiverId = :userId2)
                OR
                (message.senderId = :userId2 AND message.receiverId = :userId1)
            )`,
                { userId1, userId2 }
            )
            .andWhere('message.content IS NULL')
            .getOne();

        const filteredMessages = messages.filter(message => message.content !== null);

        const transformedMessages = filteredMessages.map(message => {
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
                receiver: {
                    id: message.receiver.id,
                    username: message.receiver.username,
                    fullName: `${message.receiver.firstName} ${message.receiver.lastName}`,
                    avatar: message.receiver.avatar
                },
                idConversation: conversation.id

            };
        });

        return new PageDto(
            transformedMessages,
            new PageMetaDto({
                itemCount: filteredMessages.length,
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

        for (const message of allMessages) {
            const otherUser = message.sender.id === userId ? message.receiver : message.sender;

            if (!conversations.has(otherUser.id)) {
                conversations.set(otherUser.id, {
                    sender: {
                        id: message.sender.id,
                        username: message.sender.username,
                        fullName: `${message.sender.firstName} ${message.sender.lastName}`,
                        avatar: message.sender.avatar,
                    },
                    receiver: {
                        id: message.receiver.id,
                        username: message.receiver.username,
                        fullName: `${message.receiver.firstName} ${message.receiver.lastName}`,
                        avatar: message.receiver.avatar,
                    },
                    lastMessage: null,
                    firstMessage: null,
                });
            }

            const currentConversation = conversations.get(otherUser.id);

            if (!currentConversation.firstMessage && message.content === null) {
                const firstMessage = await this.messageRepository.findOne({
                    where: {
                        sender: { id: message.sender.id },
                        receiver: { id: message.receiver.id },
                        content: null,
                    },
                    order: { createdAt: 'ASC' },
                    relations: ['sender', 'receiver'],
                });

                if (firstMessage) {
                    currentConversation.firstMessage = undefined;
                    currentConversation.id = firstMessage.id;
                }
            }

            if (message.content !== null) {
                if (!currentConversation.lastMessage) {
                    const createdAt = moment(message.createdAt).subtract(7, 'hours');
                    const now = moment();

                    const diffMinutes = now.diff(createdAt, 'minutes');
                    const diffHours = now.diff(createdAt, 'hours');
                    const diffDays = now.diff(createdAt, 'days');
                    const diffMonths = now.diff(createdAt, 'months');

                    let createdAgo: string;

                    if (diffMinutes === 0) {
                        createdAgo = 'Just now';
                    } else if (diffMinutes < 60) {
                        createdAgo = `${diffMinutes}m ago`;
                    } else if (diffHours < 24) {
                        createdAgo = `${diffHours}h ago`;
                    } else if (diffMonths < 1) {
                        createdAgo = `${diffDays}d ago`;
                    } else {
                        createdAgo = createdAt.format('MMM D');
                    }

                    currentConversation.lastMessage = {
                        id: message.id,
                        content: message.content,
                        status: message.status,
                        created_at: createdAt.format('HH:mm DD-MM-YYYY'),
                        created_ago: createdAgo,
                        created_by: {
                            id: message.sender.id,
                            username: message.sender.username,
                            fullName: `${message.sender.firstName} ${message.sender.lastName}`,
                            avatar: message.sender.avatar,
                        }
                    };
                }
            }

            if (message.content === null && !currentConversation.lastMessage) {
                currentConversation.lastMessage = undefined;
            }
        }

        const allConversations = Array.from(conversations.values());
        const totalConversations = allConversations.length;

        const paginatedConversations = allConversations.slice(
            params.skip,
            params.skip + params.pageSize,
        );

        return new PageDto(
            paginatedConversations,
            new PageMetaDto({
                itemCount: totalConversations,
                pageOptionsDto: params,
            })
        );
    }

    async getConver(conversationId: string): Promise<any> {
        const a = await this.messageRepository.findOne({
            where: {
                id: conversationId,
                content: null
            },
            relations: ['receiver', 'sender'],
        });

        if (!a) {
            throw new NotFoundException('Conversation not found');
        }

        const userId1 = a.receiver.id;
        const userId2 = a.sender.id;

        const receiver = await this.findById(userId1);
        const sender = await this.findById(userId2);

        return {
            id: conversationId,
            sender: {
                id: sender.id,
                username: sender.username,
                fullName: `${sender.firstName} ${sender.lastName}`,
                avatar: sender.avatar,
            },
            receiver: {
                id: receiver.id,
                username: receiver.username,
                fullName: `${receiver.firstName} ${receiver.lastName}`,
                avatar: receiver.avatar,
            },
        }
    }

}
