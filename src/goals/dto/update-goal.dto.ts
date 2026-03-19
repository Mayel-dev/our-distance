import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { GoalStatus } from '../enums/goal-status.enum';
import { GoalType } from '../enums/goal-type.enum';
import { GoalCategory } from '../enums/goal-category.enum';

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

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsDateString()
  @IsOptional()
  targetDate?: Date;

  @IsEnum(GoalCategory)
  @IsOptional()
  category?: GoalCategory;
}
