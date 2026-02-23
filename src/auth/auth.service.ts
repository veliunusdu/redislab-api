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
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // TODO: verify password via bcrypt once user has passwordHash column.

    const sid = randomUUID();

    // 1. Store session hash: sess:{sid} -> { userId }
    await this.redis.setJson(Keys.sess.byId(sid), { userId: user.id }, this.ttl);

    // 2. Track all active sessions for this user: sess:user:{userId} (Set)
    //    The Set itself has no TTL – individual session keys do.
    await this.redis.sAdd(Keys.sess.userSet(user.id), sid);

    return { sid, user };
  }

  /**
   * Logout a single session.
   * - Deletes the session key from Redis.
   * - Removes the sid from the user's session Set.
   * - Adds the sid to the revoked blocklist (same TTL) so in-flight requests
   *   holding the cookie are rejected even if there's a replication lag.
   */
  async logoutSingle(sid: string): Promise<void> {
    if (!sid) return;

    // Read session first so we can clean up the user-Set
    const session = await this.redis.getJson<{ userId: string }>(Keys.sess.byId(sid));

    // Delete the session key
    await this.redis.del(Keys.sess.byId(sid));

    if (session?.userId) {
      await this.redis.sRem(Keys.sess.userSet(session.userId), sid);
    }

    // Add to revoked blocklist with original TTL so any cached copies are rejected
    await this.redis.set(Keys.sess.revoked(sid), '1', this.ttl);
  }

  /**
   * Logout all sessions for a user.
   * Reads every sid from the user's session Set, deletes each session key,
   * adds each sid to the revoked blocklist, then deletes the Set itself.
   */
  async logoutAll(userId: string): Promise<{ count: number }> {
    const sids = await this.redis.sMembers(Keys.sess.userSet(userId));

    await Promise.all(
      sids.map(async (sid) => {
        await this.redis.del(Keys.sess.byId(sid));
        await this.redis.set(Keys.sess.revoked(sid), '1', this.ttl);
      }),
    );

    await this.redis.del(Keys.sess.userSet(userId));

    return { count: sids.length };
  }
}
