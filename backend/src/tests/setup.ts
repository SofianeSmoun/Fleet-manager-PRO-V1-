import { config } from 'dotenv';
import path from 'path';

// Charger le .env du backend pour les tests
config({ path: path.resolve(__dirname, '../../.env') });
