import { PostEntity } from 'src/post/entities/post.entity';
import { ReactionEntity } from 'src/reaction/entities/reaction.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { DateTime } from 'luxon';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column({ nullable: true })
  image: string;

  @ManyToOne(() => UserEntity, (user) => user.comments)
  user: UserEntity;

  @ManyToOne(() => PostEntity, (post) => post.comments, { onDelete: 'CASCADE' })
  post: PostEntity;

  @OneToMany(() => ReactionEntity, (reaction) => reaction.comment)
  reactions: ReactionEntity[];

  @OneToMany(() => CommentEntity, (comment) => comment.parent, { cascade: true })
  children: CommentEntity[];

  @ManyToOne(() => CommentEntity, (comment) => comment.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: CommentEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  created_by: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  setCreatedAtVietnamTime() {
    this.createdAt = DateTime.now().plus({ hours: 7 }).toJSDate();
  }
}
