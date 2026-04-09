import pg from 'pg';

const dbUrl = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL.trim() : '';

export const pool =
  dbUrl.length > 8 && !dbUrl.startsWith('#')
    ? new pg.Pool({
        connectionString: dbUrl,
        max: 6,
        idleTimeoutMillis: 30_000,
      })
    : null;
