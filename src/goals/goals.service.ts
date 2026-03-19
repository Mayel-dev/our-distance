import {
  BadRequestException,
  ForbiddenException,
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (createGoalDto.goalType === GoalType.SHARED && !user.partner) {
      throw new BadRequestException('Aún no tienes una pareja conectada');
    }

    const goal = this.goalRepository.create({
      ...createGoalDto,
      status: GoalStatus.PENDING, // por defecto
      createdBy: { id: userId },
      partner:
        createGoalDto.goalType === GoalType.SHARED && user.partner
          ? { id: user.partner.id }
          : undefined,
    });

    return this.goalRepository.save(goal);
  }

  async findOne(id: string, userId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: ['createdBy', 'partner'],
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    const isOwner = goal.createdBy.id === userId;
    const isPartner = goal.partner?.id === userId;

    if (!isOwner && !isPartner) {
      throw new ForbiddenException('No tienes permiso para ver esta meta');
    }

    return goal;
  }

  async update(id: string, updateGoalDto: UpdateGoalDto, userId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: ['createdBy', 'partner'],
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    const isOwner = goal.createdBy.id === userId;
    const isPartner = goal.partner?.id === userId;
    const isShared = goal.goalType === GoalType.SHARED;

    const canEdit = isOwner || (isShared && isPartner);

    if (!canEdit) {
      throw new ForbiddenException('No tienes permiso para editar esta meta');
    }

    if (updateGoalDto.goalType && !isOwner) {
      throw new ForbiddenException(
        'Solo el creador puede cambiar el tipo de meta',
      );
    }

    if (updateGoalDto.goalType && isOwner) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['partner'],
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (updateGoalDto.goalType === GoalType.SHARED) {
        if (!user.partner) {
          throw new BadRequestException('Aún no tienes una pareja conectada');
        }
        goal.partner = user.partner;
      }

      if (updateGoalDto.goalType === GoalType.PRIVATE) {
        goal.partner = null;
      }
    }

    // si viene progress, el status lo calculamos automáticamente
    // y no dejamos que el DTO lo pise
    if (updateGoalDto.progress !== undefined) {
      if (updateGoalDto.progress === 0) {
        goal.status = GoalStatus.PENDING;
      } else if (updateGoalDto.progress === 100) {
        goal.status = GoalStatus.COMPLETED;
      } else {
        goal.status = GoalStatus.IN_PROGRESS;
      }

      delete updateGoalDto.status; // ← evita que el form pise el status calculado
    }

    Object.assign(goal, updateGoalDto);

    return this.goalRepository.save(goal);
  }

  async remove(id: string, userId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    if (goal.createdBy.id !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta meta');
    }

    await this.goalRepository.remove(goal);
    return { message: 'Meta eliminada correctamente' };
  }

  async getMyGoals(userId: string) {
    return this.goalRepository.find({
      where: {
        createdBy: { id: userId },
        goalType: GoalType.PRIVATE,
      },
      relations: ['createdBy'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getPartnerGoals(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'],
    });

    if (!user?.partner) {
      throw new NotFoundException('No tienes pareja conectada');
    }

    return this.goalRepository.find({
      where: {
        createdBy: { id: user.partner.id },
        goalType: GoalType.PRIVATE,
      },
      relations: ['createdBy'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getSharedGoals(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['partner'],
    });

    if (!user?.partner) {
      throw new NotFoundException('No tienes pareja conectada');
    }

    // usamos query builder para manejar la lógica compleja de los goals compartidos porque TypeORM no soporta bien las condiciones OR con relaciones
    return this.goalRepository
      .createQueryBuilder('goal')
      .leftJoinAndSelect('goal.createdBy', 'createdBy')
      .leftJoinAndSelect('goal.partner', 'partner')
      .where('goal.goalType = :type', { type: GoalType.SHARED })
      .andWhere(
        '(createdBy.id = :userId AND partner.id = :partnerId) OR (createdBy.id = :partnerId AND partner.id = :userId)',
        {
          userId,
          partnerId: user.partner.id,
        },
      )
      .orderBy('goal.createdAt', 'DESC')
      .getMany();
  }
}
