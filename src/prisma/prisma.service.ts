import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL || '<missing DATABASE_URL>';
    console.log('[prisma] DATABASE_URL', dbUrl.startsWith('postgresql://') ? dbUrl.replace(/:\/\/.*@/, '://<credentials>@') : dbUrl);
    try {
      await this.$connect();
      console.log('[prisma] connected');
    } catch (err) {
      console.error('[prisma] connect error', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
