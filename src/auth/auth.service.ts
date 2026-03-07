import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // 1. Verificar si el email ya existe
    const exists = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (exists) throw new ConflictException('El email ya está registrado');

    // 2. Crear el usuario
    const user = this.userRepository.create({
      ...registerDto,
      passwordHash: await bcrypt.hash(registerDto.password, 10),
      pairingCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    const saved = await this.userRepository.save(user);

    // 3. Generar y devolver token
    return this.generateToken(saved);
  }

  async login(loginDto: LoginDto) {
    // 1. Buscar el usuario
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    // 2. Verificar password
    const isValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Credenciales incorrectas');

    // 3. Generar y devolver token
    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }
}
