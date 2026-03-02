import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GoalType } from '../enums/goal-type.enum';
import { GoalStatus } from '../enums/goal-status.enum';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: GoalType })
  goalType: GoalType;

  @Column({ type: 'enum', enum: GoalStatus })
  status: GoalStatus;

  @Column({ type: 'varchar', nullable: true })
  categoryIcon: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner: User;
}
