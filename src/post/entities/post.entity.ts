import { CommentEntity } from "src/comment/entities/comment.entity";
import { ReactionEntity } from "src/reaction/entities/reaction.entity";
import { UserEntity } from "src/user/entities/user.entity";
import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { DateTime } from 'luxon';
import { NotificationEntity } from "src/notification/entities/notification.entity";

@Entity()
export class PostEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    description: string;

    @Column('text', { array: true, nullable: true })
    images: string[];

    @Column({ type: "int", default: 0 })
    status: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => UserEntity, (user) => user.post)
    user: UserEntity[];

    @OneToMany(() => ReactionEntity, (reaction) => reaction.post)
    reactions: ReactionEntity[];

    @Column({ type: 'json', nullable: true })
    tags: { userId: string }[];

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'created_by' })
    created_by: UserEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'updated_by' })
    updated_by: UserEntity;

    @OneToMany(() => CommentEntity, (comment) => comment.post)
    comments: CommentEntity[];

    @ManyToOne(() => NotificationEntity, (notification) => notification.post, { nullable: true })
    notification: CommentEntity;

    @BeforeInsert()
    setCreatedAtVietnamTime() {
        this.created_at = DateTime.now().plus({ hours: 7 }).toJSDate();
    }

    @BeforeUpdate()
    setUpdatedAtVietnamTime() {
        this.updated_at = DateTime.now().plus({ hours: 7 }).toJSDate();
    }
}