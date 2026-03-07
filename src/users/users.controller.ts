import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ConnectPartnerDto } from './dto/connect-partner.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('me')
  update(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Delete('disconnect-partner')
  disconnectPartner(@Request() req) {
    return this.usersService.disconnectPartner(req.user.id);
  }
  @Delete('me')
  remove(@Request() req) {
    return this.usersService.remove(req.user.id);
  }

  @Post('connect-partner')
  connectPartner(@Request() req, @Body() connectPartnerDto: ConnectPartnerDto) {
    return this.usersService.connectPartner(
      req.user.id,
      connectPartnerDto.pairingCode,
    );
  }
}
