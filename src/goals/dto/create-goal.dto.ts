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
import { GoalType } from '../enums/goal-type.enum';
import { GoalCategory } from '../enums/goal-category.enum';

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
