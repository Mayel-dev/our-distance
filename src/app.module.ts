import { Module } from '@nestjs/common';

import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsModule } from './goals/goals.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    GoalsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    }),
    AuthModule,
  ],
})
export class AppModule {}
