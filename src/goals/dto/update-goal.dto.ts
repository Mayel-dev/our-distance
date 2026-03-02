import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GoalStatus } from '../enums/goal-status.enum';
import { GoalType } from '../enums/goal-type.enum';

export class UpdateGoalDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryIcon?: string;

  @IsEnum(GoalType)
  @IsOptional()
  goalType?: GoalType;

  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;
}
