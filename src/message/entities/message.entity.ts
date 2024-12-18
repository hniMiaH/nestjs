import { MessageStatus } from 'src/const';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany, BeforeInsert } from 'typeorm';
import { DateTime } from 'luxon';
import { IsOptional } from 'class-validator';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.sentMessages)
  sender: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.receivedMessages)
  receiver: UserEntity;

  @Column({ nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ReactionEntity, (reaction) => reaction.message)
  reactions: ReactionEntity[];

  @BeforeInsert()
  setCreatedAtVietnamTime() {
    this.createdAt = DateTime.now().plus({ hours: 7 }).toJSDate();
  }
}
