export interface AppConfig {
  env: 'development' | 'production' | 'test';
  isProduction: boolean;
  timezone: string;
  port: number;
  url: string;
  corsOrigins: string[];
  bodyLimit: string;
  throttle: { ttlSeconds: number; limit: number; loginLimit: number };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    logging: boolean;
  };
  jwt: { secret: string; expiresIn: string; refreshSecret: string; refreshExpiresIn: string };
  bcryptRounds: number;
  redis: { host: string; port: number; password: string };
}

const bool = (v: string | undefined, fallback: boolean): boolean =>
  v === undefined || v === '' ? fallback : ['1', 'true', 'yes'].includes(v.toLowerCase());

export const buildConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const nodeEnv = (env.NODE_ENV ?? 'development') as AppConfig['env'];
  return {
    env: nodeEnv,
    isProduction: nodeEnv === 'production',
    timezone: env.TIMEZONE ?? 'Asia/Tashkent',
    port: Number(env.APP_PORT ?? 4000),
    url: env.APP_URL ?? 'http://localhost:4000',
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    bodyLimit: env.BODY_LIMIT ?? '5mb',
    throttle: {
      ttlSeconds: Number(env.THROTTLE_TTL_SECONDS ?? 60),
      limit: Number(env.THROTTLE_LIMIT ?? 300),
      loginLimit: Number(env.LOGIN_THROTTLE_LIMIT ?? 10),
    },
    database: {
      host: env.DATABASE_HOST ?? 'localhost',
      port: Number(env.DATABASE_PORT ?? 5432),
      name: env.DATABASE_NAME ?? 'shifoxona',
      user: env.DATABASE_USER ?? 'shifoxona',
      password: env.DATABASE_PASSWORD ?? '',
      ssl: bool(env.DATABASE_SSL, false),
      logging: bool(env.DATABASE_LOGGING, false),
    },
    jwt: {
      secret: env.JWT_SECRET ?? '',
      expiresIn: env.JWT_EXPIRES_IN ?? '15m',
      refreshSecret: env.JWT_REFRESH_SECRET ?? '',
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    bcryptRounds: Number(env.BCRYPT_ROUNDS ?? 12),
    redis: {
      host: env.REDIS_HOST ?? '',
      port: Number(env.REDIS_PORT ?? 6379),
      password: env.REDIS_PASSWORD ?? '',
    },
  };
};

export const APP_CONFIG = 'app';
export default (): { app: AppConfig } => ({ app: buildConfig() });
