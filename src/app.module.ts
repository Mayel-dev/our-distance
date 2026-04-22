import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { GoalsModule } from './goals/goals.module';
import { UsersModule } from './users/users.module';

const databaseUrl = process.env.DATABASE_URL;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    GoalsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl || undefined,
      host: databaseUrl ? undefined : (process.env.DB_HOST ?? 'localhost'),
      port: databaseUrl
        ? undefined
        : Number.parseInt(process.env.DB_PORT ?? '5432', 10),
      username: databaseUrl ? undefined : process.env.DB_USERNAME,
      password: databaseUrl ? undefined : process.env.DB_PASSWORD,
      database: databaseUrl ? undefined : process.env.DB_NAME,
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
