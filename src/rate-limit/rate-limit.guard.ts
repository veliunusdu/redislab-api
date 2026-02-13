import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

import { createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { Keys } from '../redis/redis.keys';

function num(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limit = num('RATE_LIMIT_MAX', 100);
  private readonly windowSec = num('RATE_LIMIT_WINDOW_SECONDS', 60);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { headers: any }>();
    const res = context.switchToHttp().getResponse<any>();

    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (!apiKey) return true; // let your ApiKeyGuard handle missing key (if you have one)

    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex').slice(0, 16);

    const nowSec = Math.floor(Date.now() / 1000);
    const windowId = Math.floor(nowSec / this.windowSec);
    const resetSec = (windowId + 1) * this.windowSec;

    const key = Keys.rl.apiKey(`${apiKeyHash}:${windowId}`);

    // fixed window algorithm: INCR + set EXPIRE on first hit
    const count = await this.redis.raw.incr(key);
    if (count === 1) {
      await this.redis.raw.expire(key, this.windowSec);
    }

    const remaining = Math.max(this.limit - count, 0);

    // Standard-ish headers (simple + useful)
    res.setHeader('X-RateLimit-Limit', String(this.limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSec)); // epoch seconds

    if (count > this.limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
