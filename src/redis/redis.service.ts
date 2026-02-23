import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { randomUUID } from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;

  get raw() {
    return this.client;
  }

  async onModuleInit() {
    const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

    this.client = createClient({ url });

    this.client.on('error', (err) => {
      console.error('[redis] error', err);
    });

    await this.client.connect();
    console.log('[redis] connected');
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }

  // ── Strings ──────────────────────────────────────────────────────────────

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async setJson(key: string, data: unknown, ttlSeconds?: number): Promise<void> {
    const value = JSON.stringify(data);
    console.log('[redis] SET', { key, ttlSeconds });

    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  /** Increment counter; set TTL only on first creation (NX = only if Not eXists). */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1 && ttlSeconds && ttlSeconds > 0) {
      // First write – set expiry so stale keys self-clean
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  async mGet(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mGet(keys);
  }

  /** KEYS pattern – fine for dev/learning; use SCAN in production. */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async exists(key: string): Promise<boolean> {
    const n = await this.client.exists(key);
    return n > 0;
  }

  // ── Sets ─────────────────────────────────────────────────────────────────

  async sAdd(key: string, ...members: string[]): Promise<number> {
    return this.client.sAdd(key, members);
  }

  async sRem(key: string, ...members: string[]): Promise<number> {
    return this.client.sRem(key, members);
  }

  async sMembers(key: string): Promise<string[]> {
    return this.client.sMembers(key);
  }

  // ── Distributed lock ─────────────────────────────────────────────────────

  async tryLock(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const res = await this.client.set(key, token, { NX: true, PX: ttlMs });
    return res === 'OK' ? token : null;
  }

  async unlock(key: string, token: string): Promise<void> {
    const val = await this.client.get(key);
    if (val === token) await this.client.del(key);
  }
}