import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { DebugController } from './debug/debug.controller';
import { AuthModule } from './auth/auth.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { AdminController } from './admin/admin.controller';

@Module({
  imports: [
    RedisModule,
    UsersModule,
    PrismaModule,
    RateLimitModule,
    AuthModule,
    MetricsModule,
  ],
  controllers: [AppController, DebugController, AdminController],
  providers: [
    AppService,
    // Count every HTTP request – global, fire-and-forget.
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
