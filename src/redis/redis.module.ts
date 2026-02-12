import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisTestController } from './redis-test.controller';

@Global()
@Module({
  controllers: [RedisTestController],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
