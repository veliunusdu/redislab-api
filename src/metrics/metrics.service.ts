import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Keys } from '../redis/redis.keys';

// Minute buckets expire after 2 hours – keeps ~120 data points per series.
const METRIC_TTL_SECONDS = 7_200;

@Injectable()
export class MetricsService {
  constructor(private readonly redis: RedisService) {}

  /** Called by the interceptor on every request. Fire-and-forget. */
  async trackRequest(endpoint: string): Promise<void> {
    const minute = currentMinute(); // e.g. "2026-02-23T14:03"

    await Promise.all([
      this.redis.incr(Keys.metrics.globalMinute(minute), METRIC_TTL_SECONDS),
      this.redis.incr(Keys.metrics.endpointMinute(endpoint, minute), METRIC_TTL_SECONDS),
    ]);
  }

  /** Returns the last 60 minutes of request counts, global + per-endpoint. */
  async getMetrics() {
    // ── Global ────────────────────────────────────────────────────────────
    const globalKeys = await this.redis.keys(Keys.metrics.globalMinute('*'));
    const globalValues =
      globalKeys.length > 0 ? await this.redis.mGet(globalKeys) : [];

    const global = globalKeys
      .map((key, i) => ({
        minute: key.replace(/^m:/, ''),           // strip "m:" prefix
        count: Number(globalValues[i] ?? 0),
      }))
      .sort((a, b) => a.minute.localeCompare(b.minute));

    // ── Per-endpoint ───────────────────────────────────────────────────────
    const epKeys = await this.redis.keys(Keys.metrics.endpointMinute('*', '*'));
    const epValues = epKeys.length > 0 ? await this.redis.mGet(epKeys) : [];

    // key format: m:ep:{endpoint}:{YYYY-MM-DDTHH:mm}
    // The minute is always the last 16 chars (fixed ISO length).
    const byEndpoint: Record<string, { minute: string; count: number }[]> = {};

    epKeys.forEach((key, i) => {
      const withoutPrefix = key.replace(/^m:ep:/, '');   // "/api/v1/users:2026-02-23T14:03"
      const minute = withoutPrefix.slice(-16);            // last 16 chars
      const endpoint = withoutPrefix.slice(0, -17);      // everything before ":{minute}"

      if (!byEndpoint[endpoint]) byEndpoint[endpoint] = [];
      byEndpoint[endpoint].push({ minute, count: Number(epValues[i] ?? 0) });
    });

    for (const series of Object.values(byEndpoint)) {
      series.sort((a, b) => a.minute.localeCompare(b.minute));
    }

    return { global, byEndpoint };
  }
}

function currentMinute(): string {
  return new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
}
