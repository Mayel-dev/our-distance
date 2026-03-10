import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from 'src/goals/entities/goal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Goal])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
