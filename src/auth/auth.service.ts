import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Keys } from '../redis/redis.keys';

function num(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

@Injectable()
export class AuthService {
  private readonly ttl = num('SESSION_TTL_SECONDS', 60 * 60 * 24);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async login(email: string, password: string) {
    // For now: keep it simple (learning stage). Later we’ll add bcrypt properly.
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // TODO: verify password via bcrypt once user has passwordHash column.
    // if (!await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException(...)

    const sid = randomUUID();
    const key = Keys.sess.byId(sid);

    // store session -> userId
    await this.redis.setJson(key, { userId: user.id }, this.ttl);

    return { sid, user };
  }

  async logout(sid: string) {
    if (!sid) return;
    await this.redis.del(Keys.sess.byId(sid));
  }
}
