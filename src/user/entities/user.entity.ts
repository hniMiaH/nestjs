import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Gender } from '../../const';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    default: null
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

  @Column()
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
    nullable: true, // Cho phép giá trị null nếu cần
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
}