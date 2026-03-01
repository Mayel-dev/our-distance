import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 1) Método para crear un nuevo usuario validado
  async create(createUserDto: CreateUserDto) {
    // verificar email
    const emailExists = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (emailExists) throw new ConflictException('El email ya está registrado');

    // verificar username
    const usernameExists = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (usernameExists)
      throw new ConflictException('El username ya está en uso');

    // Transformar los datos
    const user = this.userRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash: await bcrypt.hash(createUserDto.password, 10), // Hash de la contraseña
      pairingCode: uuid(), // Generar un código de emparejamiento único
    });

    // Guardar el usuario en la base de datos
    return this.userRepository.save(user);
  }

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

    // Actualizar otros campos si vienen
    if (updateUserDto.username) {
      user.username = updateUserDto.username;
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
}
