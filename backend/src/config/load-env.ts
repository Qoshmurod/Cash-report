import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Minimal .env loader used by standalone scripts (TypeORM CLI, seeds) that run
 * outside the Nest ConfigModule. Real environment variables always win.
 * Order: backend/.env, then ../.env (monorepo root).
 */
export const loadEnvFiles = (): void => {
  const candidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '..', '.env')];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
};
