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
    const cacheKey = Keys.cache.user(id);
    const lockKey = Keys.lock.userRebuild(id);

    const cached = await this.redis.getJson<UserCacheDto>(cacheKey);
    if (cached) {
      console.log('[cache] HIT', { cacheKey });
      return { ok: true, source: 'cache', user: cached };
    }
    console.log('[cache] MISS', { cacheKey });

    const token = await this.redis.tryLock(lockKey, 2000);
    if (token) {
      console.log('[lock] ACQUIRED', { lockKey });

      try {
        // double-check cache
        const cached2 = await this.redis.getJson<UserCacheDto>(cacheKey);
        if (cached2) {
          console.log('[cache] HIT_AFTER_LOCK', { cacheKey });
          return { ok: true, source: 'cache', user: cached2 };
        }

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

        await this.redis.setJson(cacheKey, dto, CACHE_TTL.userSeconds);
        console.log('[cache] SET', { cacheKey, ttl: CACHE_TTL.userSeconds });

        return { ok: true, source: 'db', user: dto };
      } finally {
        await this.redis.unlock(lockKey, token);
        console.log('[lock] RELEASED', { lockKey });
      }
    }

    // lock held
    console.log('[lock] HELD', { lockKey });
    await (function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); })(75);

    const cachedRetry = await this.redis.getJson<UserCacheDto>(cacheKey);
    if (cachedRetry) {
      console.log('[cache] HIT_AFTER_WAIT', { cacheKey });
      return { ok: true, source: 'cache', user: cachedRetry };
    }

    console.log('[fallback] DB_DIRECT', { id });
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      ok: true,
      source: 'db_fallback',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async updateUser(id: string, body: { name?: string }) {
  const updated = await this.prisma.user.update({
    where: { id },
    data: { name: body.name },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}


  const cacheKey = Keys.cache.user(id);
  await this.redis.del(cacheKey);
  console.log('[cache] INVALIDATE', { cacheKey });

  return {
    ok: true,
    user: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

}
