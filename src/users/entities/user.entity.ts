import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuthSession } from 'src/auth/entities/auth-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner!: User | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  pairingCode!: string;

  @OneToMany(
    () => AuthSession,
    (authSession: AuthSession): User => authSession.user,
  )
  authSessions!: AuthSession[];

  @CreateDateColumn()
  createdAt!: Date;
}
