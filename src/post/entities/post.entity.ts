import { UserEntity } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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

    @Column({ type: "int", default: 1 })
    status: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => UserEntity, (user) => user.post)
    user: UserEntity[];

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'created_by' })
    created_by: UserEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'updated_by' })
    updated_by: UserEntity;

}