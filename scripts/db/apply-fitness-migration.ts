import { Client } from 'pg';
import { config } from 'dotenv';

config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('[fitness:migrate] Connecting...');
    await client.connect();
    await client.query('SET statement_timeout = 0');
    console.log('[fitness:migrate] BEGIN');
    await client.query('BEGIN');

    const sql = `
      ALTER TABLE "fitness_test"
      ADD COLUMN IF NOT EXISTS "higher_is_better" boolean NOT NULL DEFAULT true;
      UPDATE "fitness_test" SET "higher_is_better" = COALESCE("higher_is_better", true);
    `;
    await client.query(sql);

    await client.query('COMMIT');
    console.log('[fitness:migrate] COMMIT');
    console.log('[fitness:migrate] Done');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[fitness:migrate] Failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

