const safeEnvValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value || /^(change|replace|your[-_])/i.test(value)) {
    throw new Error(`Environment variable ${name} must be set to a real value.`);
  }
  return value;
};

export const requiredEnv = (name: string): string => safeEnvValue(name);

export function validateEnvironment(): void {
  const appEnv = safeEnvValue('APP_ENV');
  if (appEnv !== 'production' && appEnv !== 'development') {
    throw new Error('APP_ENV must be production or development.');
  }

  const username = safeEnvValue('POSTGRES_USER');
  const database = safeEnvValue('POSTGRES_DB');
  const dbPassword = safeEnvValue('POSTGRES_PASSWORD');
  safeEnvValue('DATABASE_URL');
  if (!/^[A-Za-z0-9_]+$/.test(username) || !/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('POSTGRES_USER and POSTGRES_DB may contain only letters, numbers, and underscores.');
  }
  if (!/^[A-Za-z0-9._~-]{24,}$/.test(dbPassword)) {
    throw new Error('POSTGRES_PASSWORD must be at least 24 URL-safe characters.');
  }

  const accessSecret = safeEnvValue('JWT_ACCESS_SECRET');
  if (accessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters.');
  }

  safeEnvValue('OWNER_NAME');
  safeEnvValue('OWNER_LOGIN');
  if (safeEnvValue('OWNER_PASSWORD').length < 12) {
    throw new Error('OWNER_PASSWORD must be at least 12 characters.');
  }

  const cookieSecure = safeEnvValue('COOKIE_SECURE');
  if (cookieSecure !== 'true' && cookieSecure !== 'false') {
    throw new Error('COOKIE_SECURE must be true or false.');
  }
  if (appEnv === 'production' && cookieSecure !== 'true') {
    throw new Error('COOKIE_SECURE must be true when APP_ENV=production.');
  }
}
