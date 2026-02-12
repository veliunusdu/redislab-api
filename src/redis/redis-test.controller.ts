import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('api/v1/redis')
export class RedisTestController {
  constructor(private readonly redis: RedisService) {}

  @Get('ping')
  async ping() {
    await this.redis.set('test:ping', 'pong', 30);
    const val = await this.redis.get('test:ping');
    return { ok: true, redis: val };
  }
}
