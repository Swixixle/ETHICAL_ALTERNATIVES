/**
 * Load server/.env regardless of process.cwd() (e.g. monorepo root vs server/).
 * Must be imported before any module that reads process.env at load time.
 */
import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });
