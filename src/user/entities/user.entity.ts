import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, PrimaryColumn, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Gender } from '../../const';
import { PostEntity } from 'src/post/entities/post.entity';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { MessageEntity } from 'src/message/entities/message.entity';
import { DateTime } from 'luxon';

@Entity()
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column({
    unique: true,
    nullable: true
  })
  username: string;

  @Column({
    default: null
  })
  firstName: string;

  @Column({
    default: null
  })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({
    nullable: true,
    default: null
  })
  refresh_token: string;

  @Column({
    nullable: true,
    default: null
  })
  avatar: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({
    nullable: true,
    default: null
  })
  dob: Date

  @Column({ default: 0 })
  status: number;

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date;

  @Column({
    default: null
  })
  otp: string;

  @Column({
    type: 'bigint',
    nullable: true
  })
  otpExpiration: number

  @OneToMany(() => ReactionEntity, (reaction) => reaction.user)
  reactions: ReactionEntity[];

  @OneToMany(() => PostEntity, post => post.user)
  post: PostEntity[]

  @OneToMany(() => CommentEntity, (comment) => comment.user)
  comments: CommentEntity[];

  @OneToMany(() => MessageEntity, (message) => message.sender)
  sentMessages: MessageEntity[];

  @OneToMany(() => MessageEntity, (message) => message.receiver)
  receivedMessages: MessageEntity[];

  @Column('text', { array: true, nullable: true })
  followers: string[];

  @Column('text', { array: true, nullable: true })
  followings: string[];

  @Column("int", { array: true, nullable: true })
  viewedPosts: number[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = this.generateCustomId();
    }
  }

  generateCustomId(): string {
    return [...Array(26)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
  }

  @BeforeInsert()
  setCreatedAtVietnamTime() {
    this.created_at = DateTime.now().plus({ hours: 7 }).toJSDate();
  }

  @BeforeUpdate()
  setUpdatedAtVietnamTime() {
    this.updated_at = DateTime.now().plus({ hours: 7 }).toJSDate();
  }
}