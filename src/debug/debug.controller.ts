import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Keys } from '../redis/redis.keys';

@Controller('debug')
export class DebugController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('prisma-check')
  async prismaCheck(@Query('id') id?: string) {
    const dbUrl = process.env.DATABASE_URL || '<missing DATABASE_URL>';
    const user = id ? await this.prisma.user.findUnique({ where: { id } }) : null;
    return { dbUrl, user };
  }

  @Get('session-check')
  async sessionCheck(@Query('sid') sid?: string) {
    if (!sid) return { error: 'missing sid query param' };

    const key = Keys.sess.byId(sid);
    const session = await this.redis.getJson<{ userId: string }>(key);

    const user = session?.userId
      ? await this.prisma.user.findUnique({ where: { id: session.userId } })
      : null;

    const charCodes = session?.userId
      ? Array.from(session.userId).map((c) => c.charCodeAt(0))
      : null;

    return { sid, key, session, charCodes, user };
  }
}
