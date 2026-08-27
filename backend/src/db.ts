import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5433/bridgeiq_db';

export const pool = new Pool({
  connectionString,
});

pool.on('error', (err) => {
  console.error('[BridgeIQ DB] Unexpected error on idle client:', err);
});
