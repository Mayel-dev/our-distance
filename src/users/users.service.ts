import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';
import { Goal } from 'src/goals/entities/goal.entity';
import { AuthSession } from 'src/auth/entities/auth-session.entity';

interface PasswordResetPayload {
  sub: string;
  purpose?: string;
  rv?: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Goal)
    private goalRepository: Repository<Goal>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['partner'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (updateUserDto.username) {
      const usernameExists = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (usernameExists && usernameExists.id !== id) {
        throw new ConflictException('El username ya esta en uso');
      }
      user.username = updateUserDto.username;
    }

    return this.userRepository.save(user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Contrasena actual incorrecta');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'La nueva contrasena debe ser diferente a la actual',
      );
    }

    user.passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.passwordResetVersion += 1;

    await this.userRepository.save(user);
    await this.revokeActiveSessions(user.id);

    return { message: 'Contrasena actualizada correctamente' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      const resetSecret =
        this.configService.get<string>('JWT_RESET_SECRET') ??
        this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

      const resetExpiresIn =
        this.configService.get<string>('JWT_RESET_EXPIRES_IN') ?? '15m';

      const resetToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          purpose: 'password-reset',
          rv: user.passwordResetVersion,
        },
        {
          secret: resetSecret,
          expiresIn: resetExpiresIn as StringValue,
        },
      );

      return {
        message:
          'Si el correo existe, recibiras instrucciones para restablecer tu contrasena.',
        resetToken,
      };
    }

    return {
      message:
        'Si el correo existe, recibiras instrucciones para restablecer tu contrasena.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const resetSecret =
        this.configService.get<string>('JWT_RESET_SECRET') ??
        this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

      const payload = await this.jwtService.verifyAsync<PasswordResetPayload>(
        token,
        {
          secret: resetSecret,
        },
      );

      if (payload.purpose !== 'password-reset') {
        throw new UnauthorizedException('Token de reset invalido');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (payload.rv !== user.passwordResetVersion) {
        throw new UnauthorizedException('Token de reset invalido');
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.passwordResetVersion += 1;
      await this.userRepository.save(user);
      await this.revokeActiveSessions(user.id);

      return { message: 'Contrasena actualizada correctamente' };
    } catch {
      throw new BadRequestException('Token invalido o expirado');
    }
  }

  private async revokeActiveSessions(userId: string) {
    await this.authSessionRepository.update(
      {
        userId,
        revokedAt: IsNull(),
      },
      {
        revokedAt: new Date(),
      },
    );
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['partner'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.goalRepository.query(
      `UPDATE goals SET partner_id = NULL WHERE partner_id = $1`,
      [id],
    );

    await this.goalRepository
      .createQueryBuilder()
      .delete()
      .where('created_by = :id', { id })
      .execute();

    if (user.partner) {
      const partner = await this.userRepository.findOne({
        where: { id: user.partner.id },
      });
      if (partner) {
        partner.partner = null;
        partner.pairingCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        await this.userRepository.save(partner);
      }
    }

    user.partner = null;
    await this.userRepository.save(user);

    await this.userRepository.remove(user);
    return { message: 'Usuario eliminado correctamente' };
  }

  async connectPartner(userId: string, pairingCode: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.partner) {
      throw new ConflictException('Ya tienes una pareja conectada');
    }

    const partner = await this.userRepository.findOne({
      where: { pairingCode },
      relations: ['partner'],
    });
    if (!partner) throw new NotFoundException('Codigo de pareja invalido');

    if (partner.id === userId) {
      throw new ConflictException('No puedes conectarte contigo mismo');
    }

    if (partner.partner) {
      throw new ConflictException('Este usuario ya tiene una pareja');
    }

    user.partner = partner;
    partner.partner = user;

    await this.userRepository.save(user);
    await this.userRepository.save(partner);

    return { message: 'Pareja conectada exitosamente' };
  }

  async disconnectPartner(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'],
    });

    if (!user?.partner) {
      throw new BadRequestException('No tienes pareja conectada');
    }

    const partner = user.partner;

    user.partner = null;
    user.pairingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    partner.partner = null;
    partner.pairingCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    await this.userRepository.save(user);
    await this.userRepository.save(partner);

    return { message: 'Pareja desconectada correctamente' };
  }
}
