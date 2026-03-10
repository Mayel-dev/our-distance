import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { ConflictException } from '@nestjs/common';

import { Goal } from 'src/goals/entities/goal.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Goal)
    private goalRepository: Repository<Goal>,
  ) {}

  async findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['partner'], // 👈 solo esto
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
        throw new ConflictException('El username ya está en uso');
      }
      user.username = updateUserDto.username;
    }

    if (updateUserDto.password) {
      // Verificar contraseña actual
      if (!updateUserDto.currentPassword) {
        throw new BadRequestException('Debes ingresar tu contraseña actual');
      }
      const isValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.passwordHash,
      );
      if (!isValid) {
        throw new UnauthorizedException('Contraseña actual incorrecta');
      }
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.userRepository.save(user);
  }

  // Método para eliminar usuario y manejar relaciones
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

    // 2. Eliminar TODAS las metas del usuario
    await this.goalRepository
      .createQueryBuilder()
      .delete()
      .where('created_by = :id', { id })
      .execute();

    // 3. Desconectar pareja
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

    // 4. Quitar partner_id del usuario antes de eliminar
    user.partner = null;
    await this.userRepository.save(user);

    // 5. Eliminar el usuario
    await this.userRepository.remove(user);
    return { message: 'Usuario eliminado correctamente' };
  }

  async connectPartner(userId: string, pairingCode: string) {
    // 1. Buscar el usuario actual
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // 2. Verificar que no tenga ya pareja
    if (user.partner) {
      throw new ConflictException('Ya tienes una pareja conectada');
    }

    // 3. Buscar el partner por pairingCode
    const partner = await this.userRepository.findOne({
      where: { pairingCode },
      relations: ['partner'],
    });
    if (!partner) throw new NotFoundException('Código de pareja inválido');

    // 4. Verificar que no sea el mismo usuario
    if (partner.id === userId) {
      throw new ConflictException('No puedes conectarte contigo mismo');
    }

    // 5. Verificar que el partner no tenga ya pareja
    if (partner.partner) {
      throw new ConflictException('Este usuario ya tiene una pareja');
    }

    // 6. Conectar los dos usuarios
    user.partner = partner;
    partner.partner = user;

    await this.userRepository.save(user);
    await this.userRepository.save(partner);

    return { message: 'Pareja conectada exitosamente' };
  }

  // Método para desconectar pareja y generar nuevos códigos
  async disconnectPartner(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'],
    });

    if (!user?.partner) {
      throw new BadRequestException('No tienes pareja conectada');
    }

    const partner = user.partner;

    // Desconectar los dos y generar nuevos códigos
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
