import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Keys } from '../redis/redis.keys';
import { CACHE_TTL } from '../redis/cache.ttl';

type UserCacheDto = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getByIdCached(id: string) {
    const key = Keys.cache.user(id);

    const cached = await this.redis.getJson<UserCacheDto>(key);
    if (cached) {
      console.log('[cache] HIT', { key });
      return { ok: true, source: 'cache', user: cached };
    }

    console.log('[cache] MISS', { key });

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const dto: UserCacheDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };

    await this.redis.setJson(key, dto, CACHE_TTL.userSeconds);
    console.log('[cache] SET', { key, ttl: CACHE_TTL.userSeconds });
    
    return { ok: true, source: 'db', user: dto };
  }
}
