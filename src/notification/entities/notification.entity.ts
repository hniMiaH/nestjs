import { MessageStatus } from 'src/const';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany, BeforeInsert } from 'typeorm';
import { DateTime } from 'luxon';
import { IsOptional } from 'class-validator';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { PostEntity } from 'src/post/entities/post.entity';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CommentEntity, (comment) => comment.notification, { eager: true, nullable: true })
  comment: CommentEntity;

  @ManyToOne(() => PostEntity, (post) => post.notification, { eager: true, nullable: true })
  post: PostEntity;

  @ManyToOne(() => UserEntity, (user) => user.sentMessages)
  receiver: UserEntity;

  @BeforeInsert()
  setCreatedAtVietnamTime() {
    this.createdAt = DateTime.now().plus({ hours: 7 }).toJSDate();
  }
}
