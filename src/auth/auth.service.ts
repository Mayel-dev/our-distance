import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { User } from 'src/users/entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface TokenPayload {
  sub: string;
  email: string;
  sid: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const exists = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (exists) {
      throw new ConflictException('El email ya está registrado');
    }

    const user = this.userRepository.create({
      ...registerDto,
      passwordHash: await bcrypt.hash(registerDto.password, 10),
      pairingCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    const saved = await this.userRepository.save(user);

    return this.createSessionAndTokens(saved);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.createSessionAndTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      const session = await this.authSessionRepository.findOne({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: IsNull(),
        },
      });

      if (!session) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);

      if (!matches) {
        session.revokedAt = new Date();
        await this.authSessionRepository.save(session);
        throw new UnauthorizedException('Refresh token inválido');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const tokens = await this.generateTokens(user, session.id);
      session.refreshTokenHash = await this.hashToken(tokens.refresh_token);
      session.expiresAt = this.getTokenExpiration(tokens.refresh_token);
      await this.authSessionRepository.save(session);

      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(userId: string, sessionId: string) {
    const session = await this.authSessionRepository.findOne({
      where: {
        id: sessionId,
        userId,
        revokedAt: IsNull(),
      },
    });

    if (session) {
      session.revokedAt = new Date();
      await this.authSessionRepository.save(session);
    }

    return { message: 'Sesión cerrada correctamente' };
  }

  private async createSessionAndTokens(user: User) {
    const session = this.authSessionRepository.create({
      id: randomUUID(),
      userId: user.id,
      refreshTokenHash: '',
      expiresAt: new Date(),
      revokedAt: null,
    });

    const tokens = await this.generateTokens(user, session.id);
    session.refreshTokenHash = await this.hashToken(tokens.refresh_token);
    session.expiresAt = this.getTokenExpiration(tokens.refresh_token);

    await this.authSessionRepository.save(session);

    return tokens;
  }

  private async generateTokens(user: User, sessionId: string) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      sid: sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<StringValue>(
          'JWT_ACCESS_EXPIRES_IN',
        ),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<StringValue>(
          'JWT_REFRESH_EXPIRES_IN',
        ),
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  private async hashToken(token: string) {
    return bcrypt.hash(token, 10);
  }

  private getTokenExpiration(token: string) {
    const decoded = this.jwtService.decode(token);

    if (
      !decoded ||
      typeof decoded === 'string' ||
      typeof decoded.exp !== 'number'
    ) {
      throw new UnauthorizedException(
        'No se pudo determinar la expiración del token',
      );
    }

    return new Date(decoded.exp * 1000);
  }
}
