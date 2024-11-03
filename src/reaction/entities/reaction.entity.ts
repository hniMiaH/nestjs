import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';
import { reactionType } from 'src/const';
import { PostEntity } from 'src/post/entities/post.entity';
import { CommentEntity } from 'src/comment/entities/comment.entity';
import { MessageEntity } from 'src/message/entities/message.entity';

@Entity()
export class ReactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: reactionType
  })
  reactionType: reactionType;

  @ManyToOne(() => UserEntity, (user) => user.reactions, { eager: true })
  user: UserEntity;

  @ManyToOne(() => PostEntity, (post) => post.reactions, { eager: true, nullable: true })
  post: PostEntity;

  @ManyToOne(() => CommentEntity, (comment) => comment.reactions, { eager: true, nullable: true })
  comment: CommentEntity;

  @ManyToOne(() => MessageEntity, (message) => message.reactions, { eager: true, nullable: true })
  message: CommentEntity;
}
