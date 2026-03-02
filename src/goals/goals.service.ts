import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Goal } from './entities/goal.entity';
import { Repository } from 'typeorm';
import { GoalStatus } from './enums/goal-status.enum';
import { GoalType } from './enums/goal-type.enum';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalRepository: Repository<Goal>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createGoalDto: CreateGoalDto, userId: string) {
    // 1. Buscar el usuario con su partner
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'], // traer también el partner
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    // 2. Si quiere meta SHARED pero no tiene partner
    if (createGoalDto.goalType === GoalType.SHARED && !user.partner) {
      throw new BadRequestException('Aún no tienes una pareja conectada');
    }

    // 3. Crear la meta
    const goal = this.goalRepository.create({
      ...createGoalDto,
      status: GoalStatus.PENDING,
      createdBy: { id: userId },
      partner:
        createGoalDto.goalType === GoalType.SHARED && user.partner
          ? { id: user.partner.id } // si ambas cosas son ciertas, asignar el partner
          : undefined, // si no, dejarlo como undefined para que no se asigne ningún partner
    });

    return this.goalRepository.save(goal);
  }

  findAll() {
    return `This action returns all goals`;
  }

  async findOne(id: string) {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    return goal;
  }

  async update(id: string, updateGoalDto: UpdateGoalDto) {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Meta no encontrada');

    Object.assign(goal, updateGoalDto);

    return this.goalRepository.save(goal);
  }

  async remove(id: string) {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    return this.goalRepository.remove(goal);
  }
}
