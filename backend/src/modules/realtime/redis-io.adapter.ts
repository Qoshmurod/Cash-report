import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, ServerOptions } from 'socket.io';

const REDIS_CONNECT_TIMEOUT_MS = 3000;

/**
 * Socket.IO adapter backed by Redis pub/sub so events reach clients connected
 * to any backend replica. Falls back to the in-memory adapter if Redis is unreachable.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly redisLogger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly corsOrigins: string[],
  ) {
    super(app);
  }

  async connectToRedis(host: string, port: number, password: string): Promise<boolean> {
    if (!host) return false;
    const options = {
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
    };
    const pub = new Redis(options);
    const sub = new Redis(options);
    pub.on('error', (e: Error) => this.redisLogger.warn(`Redis pub error: ${e.message}`));
    sub.on('error', (e: Error) => this.redisLogger.warn(`Redis sub error: ${e.message}`));
    try {
      await Promise.all([pub.connect(), sub.connect()]);
      this.adapterConstructor = createAdapter(pub, sub);
      this.redisLogger.log(`Socket.IO Redis adapter connected (${host}:${port})`);
      return true;
    } catch (error) {
      this.redisLogger.warn(`Redis unavailable (${(error as Error).message}) — using in-memory Socket.IO adapter`);
      pub.disconnect();
      sub.disconnect();
      return false;
    }
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigins, credentials: true },
    }) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
