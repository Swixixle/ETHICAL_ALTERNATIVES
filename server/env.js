/**
 * Load server/.env regardless of process.cwd() (e.g. monorepo root vs server/).
 * Then merge repo-root and cwd .env without overriding keys already set (e.g. DATABASE_URL
 * only in ../.env when server/.env omits it).
 * Must be imported before any module that reads process.env at load time.
 */
import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: join(__dirname, '.env') });
config({ path: join(__dirname, '..', '.env'), override: false });
config({ path: join(process.cwd(), '.env'), override: false });
