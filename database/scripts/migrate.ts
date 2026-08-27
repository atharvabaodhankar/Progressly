import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5432/bridgeiq_db';

const migrationsDir = path.resolve(__dirname, '../migrations');

async function runMigrations() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  console.log('[BridgeIQ Migration] Connecting to database...');
  await client.connect();
  console.log('[BridgeIQ Migration] Connected successfully.');

  try {
    // 1. Create tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read existing migrations
    const res = await client.query('SELECT name FROM schema_migrations ORDER BY id ASC');
    const appliedMigrations = new Set(res.rows.map((r: { name: string }) => r.name));

    // 3. Read migration files from disk
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let count = 0;

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`[BridgeIQ Migration] - Already applied: ${file}`);
        continue;
      }

      console.log(`[BridgeIQ Migration] > Applying: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[BridgeIQ Migration] ✓ Successfully applied: ${file}`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[BridgeIQ Migration] ✗ Error applying ${file}:`, err);
        throw err;
      }
    }

    if (count === 0) {
      console.log('[BridgeIQ Migration] Database is already up to date. No pending migrations.');
    } else {
      console.log(`[BridgeIQ Migration] Complete! Applied ${count} new migration(s).`);
    }
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('[BridgeIQ Migration] Migration runner failed:', err);
  process.exit(1);
});
