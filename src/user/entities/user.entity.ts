import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, PrimaryColumn } from 'typeorm';
import { Gender } from '../../const';

@Entity()
export class User {
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

  @Column({nullable: true})
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

  @BeforeInsert()
  generateId() {
    // Sử dụng UUID hoặc tạo chuỗi tùy chỉnh theo yêu cầu của bạn
    this.id = this.generateCustomId();
  }

  generateCustomId(): string {
    // Tạo chuỗi tùy chỉnh, ví dụ như chuỗi ngẫu nhiên dài 26 ký tự
    return [...Array(26)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
  }
}