import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_PREFIX, SWAGGER_PATH } from './common/constants/app.constants';
import { AppConfig } from './config/configuration';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });
  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');
  const logger = new Logger('Bootstrap');

  // Behind nginx / a load balancer: take the client IP from X-Forwarded-For (login history, audit).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(json({ limit: config.bodyLimit }));
  app.use(urlencoded({ extended: true, limit: config.bodyLimit }));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Swagger UI needs inline styles/scripts and data: images
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    }),
  );
  app.use(compression());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();

  const redisAdapter = new RedisIoAdapter(app, config.corsOrigins);
  await redisAdapter.connectToRedis(config.redis.host, config.redis.port, config.redis.password);
  app.useWebSocketAdapter(redisAdapter);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shifoxona Management System API')
    .setDescription(
      'Hospital / medical center REST API. All responses use the envelope `{ success, data, meta? }`; errors use `{ success:false, error }`. ' +
        'Real-time events: Socket.IO namespace `/realtime`.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_PATH, app, document, { swaggerOptions: { persistAuthorization: true } });

  await app.listen(config.port, '0.0.0.0');
  logger.log(`API ready on ${config.url}/${API_PREFIX} (env: ${config.env}, tz: ${config.timezone})`);
  logger.log(`Swagger UI: ${config.url}/${SWAGGER_PATH}`);
}

void bootstrap();
