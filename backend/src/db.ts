import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const rawConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@127.0.0.1:5433/bridgeiq_db';

// Ensure IPv4 on Windows to prevent ::1 ECONNREFUSED
const connectionString = rawConnectionString.replace('localhost', '127.0.0.1');
const isProduction =
  process.env.NODE_ENV === 'production' ||
  connectionString.includes('rds.amazonaws.com') ||
  connectionString.includes('amazonaws.com');

export const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[BridgeIQ DB] Unexpected error on idle client:', err);
});
