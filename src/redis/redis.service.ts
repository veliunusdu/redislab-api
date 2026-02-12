import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

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

  if (ttlSeconds && ttlSeconds > 0) {
    await this.client.set(key, value, { EX: ttlSeconds });
  } else {
    await this.client.set(key, value);
  }
}

}
