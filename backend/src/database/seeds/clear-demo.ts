import { Logger } from '@nestjs/common';
import { loadEnvFiles } from '../../config/load-env';
import { AppDataSource } from '../data-source';

/**
 * Removes clients and everything recorded about them (payments, queues, visits, kiosk requests,
 * contracts, day closings) — e.g. the demo data of a test install. Staff accounts, departments,
 * services, doctors and settings are kept. Requires the --yes flag.
 *
 *   npm run demo:clear -- --yes                                   (development)
 *   docker compose exec backend node dist/database/seeds/clear-demo.js --yes   (server)
 */
const TABLES = [
  'visits',
  'queue_ticket_services',
  'queue_tickets',
  'queue_counters',
  'kiosk_request_items',
  'kiosk_requests',
  'payment_transactions',
  'payment_items',
  'payments',
  'day_closings',
  'contract_deposits',
  'contract_patients',
  'contracts',
  'patients',
];

const main = async (): Promise<void> => {
  const logger = new Logger('ClearDemo');
  if (!process.argv.includes('--yes')) {
    logger.warn('Bu buyruq barcha mijozlar va ularning to‘lov/navbat ma’lumotlarini o‘chiradi. Tasdiqlash uchun --yes qo‘shing.');
    process.exit(1);
  }
  loadEnvFiles();
  await AppDataSource.initialize();
  try {
    const existing: { table_name: string }[] = await AppDataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [TABLES],
    );
    const names = TABLES.filter((t) => existing.some((e) => e.table_name === t));
    await AppDataSource.query(`TRUNCATE ${names.map((n) => `"${n}"`).join(', ')} RESTART IDENTITY CASCADE`);
    for (const seq of ['patient_code_seq', 'receipt_number_seq']) await AppDataSource.query(`ALTER SEQUENCE IF EXISTS "${seq}" RESTART WITH 1`);
    await AppDataSource.query(`ALTER SEQUENCE IF EXISTS "kiosk_request_number_seq" RESTART WITH 1001`);
    logger.log(`Tozalandi: ${names.join(', ')}`);
  } finally {
    await AppDataSource.destroy();
  }
};

main().catch((error: unknown) => {
  new Logger('ClearDemo').error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
