import { Controller, Get, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { AppConfig } from '../../config/configuration';

const REDIS_PING_TIMEOUT_MS = 1000;

@ApiTags('Health')
@Controller('health')
export class HealthController implements OnModuleDestroy {
  private readonly redis: Redis | null;

  constructor(
    private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    const { host, port, password } = config.getOrThrow<AppConfig>('app').redis;
    this.redis = host
      ? new Redis({ host, port, password: password || undefined, lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false })
      : null;
    this.redis?.on('error', () => undefined);
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe' })
  async check(): Promise<{ status: 'ok'; db: 'up'; redis: 'up' | 'down'; time: string }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database is down');
    }
    return { status: 'ok', db: 'up', redis: await this.redisStatus(), time: new Date().toISOString() };
  }

  private async redisStatus(): Promise<'up' | 'down'> {
    if (!this.redis) return 'down';
    try {
      if (this.redis.status === 'wait' || this.redis.status === 'end') await this.redis.connect();
      const pong = await Promise.race([
        this.redis.ping(),
        new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), REDIS_PING_TIMEOUT_MS)),
      ]);
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
