import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';

@Controller('api/v1/users')
@UseGuards(RateLimitGuard)
@UseGuards(SessionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: any) {
    return { ok: true, user: req.user };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.users.getByIdCached(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string }) {
    return this.users.updateUser(id, body);
  }
}
