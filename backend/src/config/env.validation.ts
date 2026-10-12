import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  TIMEZONE: Joi.string().default('Asia/Tashkent'),
  APP_PORT: Joi.number().port().default(4000),
  APP_URL: Joi.string().default('http://localhost:4000'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  BODY_LIMIT: Joi.string().default('5mb'),
  THROTTLE_TTL_SECONDS: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(300),
  LOGIN_THROTTLE_LIMIT: Joi.number().integer().min(1).default(10),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),

  REDIS_HOST: Joi.string().allow('').default(''),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
}).unknown(true);
