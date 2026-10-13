import { Logger } from '@nestjs/common';
import { buildConfig } from '../../config/configuration';
import { loadEnvFiles } from '../../config/load-env';
import { AppDataSource } from '../data-source';
import { runSeed } from './seeder';

const bool = (v: string | undefined, fallback: boolean): boolean => (v === undefined || v === '' ? fallback : ['1', 'true', 'yes'].includes(v.toLowerCase()));

const main = async (): Promise<void> => {
  loadEnvFiles();
  const config = buildConfig();
  await AppDataSource.initialize();
  try {
    await runSeed(AppDataSource, {
      isProduction: config.isProduction,
      bcryptRounds: config.bcryptRounds,
      adminLogin: process.env.SEED_ADMIN_LOGIN ?? 'admin01',
      adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'admin01',
      superAdminLogin: (process.env.SUPER_ADMIN_LOGINS ?? '').split(',')[0]?.trim() || undefined,
      superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD || undefined,
      kioskLogin: process.env.SEED_KIOSK_LOGIN ?? 'panel01',
      kioskPassword: process.env.SEED_KIOSK_PASSWORD ?? 'panel01',
      demoData: bool(process.env.SEED_DEMO_DATA, false),
      demoStaff: bool(process.env.SEED_DEMO_STAFF, false),
      timezone: config.timezone,
    });
  } finally {
    await AppDataSource.destroy();
  }
};

main().catch((error: unknown) => {
  new Logger('Seeder').error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
