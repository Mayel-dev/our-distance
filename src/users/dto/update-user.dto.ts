import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  username?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string | undefined;

  @IsString()
  @IsOptional()
  currentPassword?: string;
}
