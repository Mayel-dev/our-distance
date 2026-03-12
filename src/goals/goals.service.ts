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

  async findOne(id: string, userId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: ['createdBy', 'partner'],
    });

    if (!goal) throw new NotFoundException('Meta no encontrada');
    // Verificar que el usuario sea el dueño o el partner
    const isOwner = goal.createdBy.id === userId;
    const isPartner = goal.partner?.id === userId;

    if (!isOwner && !isPartner) {
      throw new ForbiddenException('No tienes permiso para ver esta meta');
    }

    return goal;
  }

  // Update method with permission check: only the owner can update the goal, but if it's SHARED, partner can edit as well
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

    // Permiso general de edición
    const canEdit = isOwner || (isShared && isPartner);

    if (!canEdit) {
      throw new ForbiddenException('No tienes permiso para editar esta meta');
    }

    // Solo el dueño puede hacer cambios estructurales
    if (updateGoalDto.goalType && !isOwner) {
      throw new ForbiddenException(
        'Solo el creador puede cambiar el tipo de meta',
      );
    }

    // Si el dueño quiere cambiar el tipo de meta
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

    Object.assign(goal, updateGoalDto);

    return this.goalRepository.save(goal);
  }

  // Remove method with permission check: only the owner can delete the goal
  async remove(id: string, userId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!goal) throw new NotFoundException('Meta no encontrada');

    // Solo el dueño puede eliminarla

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
      .getMany();
  }
}
