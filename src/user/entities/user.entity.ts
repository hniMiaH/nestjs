import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    default: null
  })
  username: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    nullable: true,
    default: null
  })
  refresh_token: string;

  @Column({ nullable: true, default: null })
  avatar: string;

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
}