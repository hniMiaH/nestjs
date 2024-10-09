import { ReactionEntity } from "src/reaction/entities/reaction.entity";
import { UserEntity } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class PostEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    image: string;

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

}