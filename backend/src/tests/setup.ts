import { config } from 'dotenv';
import path from 'path';

// Charger le .env du backend pour les tests
config({ path: path.resolve(__dirname, '../../.env') });

// En mode integration, utiliser la base de test
const testFile = process.env['VITEST_POOL_ID'] !== undefined ? (globalThis as Record<string, unknown>)['__vitest_worker__'] : undefined;
void testFile;

if (process.env['DATABASE_URL_TEST'] && process.env['INTEGRATION_TEST'] === '1') {
  process.env['DATABASE_URL'] = process.env['DATABASE_URL_TEST'];
}
