import { execSync } from 'child_process';
import path from 'path';

const SCHEMA_PATH = path.resolve(__dirname, '../../../prisma/schema.prisma');

export async function setup(): Promise<void> {
  // Load .env for DATABASE_URL_TEST
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

  const dbUrl = process.env['DATABASE_URL_TEST'] ?? process.env['DATABASE_URL'];
  if (!dbUrl) {
    throw new Error('DATABASE_URL_TEST or DATABASE_URL must be set for integration tests');
  }

  // Push schema to test DB (reset)
  execSync(`npx prisma db push --force-reset --schema="${SCHEMA_PATH}"`, {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  });
}
