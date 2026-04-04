import pg from 'pg';

export const pool =
  process.env.DATABASE_URL && process.env.DATABASE_URL.length > 3
    ? new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: 6,
        idleTimeoutMillis: 30_000,
      })
    : null;
