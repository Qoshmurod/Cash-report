import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { AppConfig } from '../config/configuration';
import { SnakeNamingStrategy } from '../common/utils/snake-naming.strategy';
import { ENTITIES } from './entities';

export const buildTypeOrmOptions = (config: AppConfig): DataSourceOptions => ({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  logging: config.database.logging,
  entities: ENTITIES,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  uuidExtension: 'pgcrypto',
  extra: { max: 20, options: `-c timezone=${config.timezone}` },
});
