import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    //Verificar si el usuario existe
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new ConflictException('User not found');
    }

    // Verificar que el nuevo username no esté en uso por otro usuario
    if (updateUserDto.username) {
      const usernameExists = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      //  verificar que no sea el mismo usuario
      if (usernameExists && usernameExists.id !== id) {
        throw new ConflictException('El username ya está en uso');
      }
      user.username = updateUserDto.username;
    }

    // Si viene password, encriptarlo
    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Guardar
    return this.userRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

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
