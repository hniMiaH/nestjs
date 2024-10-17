import { UserEntity } from 'src/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.sentMessages)
  sender: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.receivedMessages)
  receiver: UserEntity;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
