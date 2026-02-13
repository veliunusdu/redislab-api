import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Keys } from '../redis/redis.keys';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: any = ctx.switchToHttp().getRequest();

    const cookieName = process.env.SESSION_COOKIE_NAME || 'sid';
    const sid = req.cookies?.[cookieName] || req.headers['x-session-id'];

    if (!sid) throw new UnauthorizedException('Missing session');

    const session = await this.redis.getJson<{ userId: string }>(Keys.sess.byId(sid));
    if (!session?.userId) throw new UnauthorizedException('Invalid session');

    // debug: show exact userId value and character codes to detect invisible chars
    try {
      console.log('[debug] session.userId (raw)', JSON.stringify(session.userId));
      const codes = Array.from(session.userId).map((c) => c.charCodeAt(0));
      console.log('[debug] session.userId charCodes', codes);
    } catch (err) {
      console.warn('[debug] failed to stringify session.userId', err);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    req.user = user; // attach to request
    return true;
  }
}
