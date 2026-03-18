import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

// Extendemos la interfaz Request para incluir el usuario autenticado
interface RequestWithUser extends Request {
  user: { id: string; email: string }; // Los campos que tenga tu JWT
}

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(
    @Request() req: RequestWithUser,
    @Body() createGoalDto: CreateGoalDto,
  ) {
    return this.goalsService.create(createGoalDto, req.user.id);
  }

  @Get('my-goals')
  getMyGoals(@Request() req: RequestWithUser) {
    return this.goalsService.getMyGoals(req.user.id);
  }

  @Get('partner-goals')
  getPartnerGoals(@Request() req: RequestWithUser) {
    return this.goalsService.getPartnerGoals(req.user.id);
  }

  @Get('shared-goals')
  getSharedGoals(@Request() req: RequestWithUser) {
    return this.goalsService.getSharedGoals(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.goalsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(id, updateGoalDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.goalsService.remove(id, req.user.id);
  }
}
