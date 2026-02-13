import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { DebugController } from './debug/debug.controller';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [RedisModule, UsersModule, PrismaModule, RateLimitModule, AuthModule],
  controllers: [AppController, DebugController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RateLimitModule,
    },
  ],
})
export class AppModule {}
