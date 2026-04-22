import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from 'src/goals/entities/goal.entity';
import { JwtModule } from '@nestjs/jwt';
import { AuthSession } from 'src/auth/entities/auth-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Goal, AuthSession]),
    JwtModule.register({}),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
