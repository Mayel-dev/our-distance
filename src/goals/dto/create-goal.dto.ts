import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GoalType } from '../enums/goal-type.enum';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsEnum(GoalType)
  goalType: GoalType;

  @IsString()
  @IsOptional()
  categoryIcon?: string;
}
