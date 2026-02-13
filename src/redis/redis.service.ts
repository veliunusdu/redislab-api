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

  async tryLock(key: string, ttlMs: number): Promise<string | null> {
  const token = randomUUID();
  const res = await this.client.set(key, token, { NX: true, PX: ttlMs });
  return res === 'OK' ? token : null;
}

async unlock(key: string, token: string): Promise<void> {
  // simple unlock (not 100% safe in race conditions, but good for learning)
  const val = await this.client.get(key);
  if (val === token) await this.client.del(key);
}

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }

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

}
