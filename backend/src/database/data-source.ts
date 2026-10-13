import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildConfig } from '../config/configuration';
import { loadEnvFiles } from '../config/load-env';
import { buildTypeOrmOptions } from './typeorm.options';

loadEnvFiles();

/** Used by the TypeORM CLI (migrations) and the seed runner. */
export const AppDataSource = new DataSource(buildTypeOrmOptions(buildConfig()));

