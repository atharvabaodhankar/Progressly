import { Pool, QueryResult, QueryResultRow } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'ai-worker/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const rawConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@127.0.0.1:5433/bridgeiq_db';

const connectionString = rawConnectionString.replace('localhost', '127.0.0.1');
const isProduction =
  process.env.NODE_ENV === 'production' ||
  connectionString.includes('rds.amazonaws.com') ||
  connectionString.includes('amazonaws.com');

const pgPool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 2000,
});

let pgliteInstance: PGlite | null = null;
let useEmbeddedMode = false;
let probeCompleted = false;

function getPGlite(): PGlite {
  if (!pgliteInstance) {
    const dataDir = path.resolve(process.cwd(), 'data/pglite_db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
  }
  return pgliteInstance;
}

export async function initializeDatabase(): Promise<void> {
  if (probeCompleted) return;

  let hostDisplay = connectionString;
  try {
    const urlObj = new URL(connectionString);
    hostDisplay = `${urlObj.hostname}:${urlObj.port || 5432}${urlObj.pathname}`;
  } catch {
    hostDisplay = connectionString;
  }

  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    useEmbeddedMode = false;
  } catch (err: any) {
    useEmbeddedMode = true;
    getPGlite();
  }
  probeCompleted = true;
}

export interface DbClient {
  query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
  release(): void;
}

export const pool = {
  async query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
    if (!probeCompleted) {
      await initializeDatabase();
    }

    if (!useEmbeddedMode) {
      try {
        return await pgPool.query<R>(text, params);
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.message?.includes('timeout')) {
          useEmbeddedMode = true;
        } else {
          throw err;
        }
      }
    }

    const pglite = getPGlite();
    try {
      if (!params || params.length === 0) {
        const trimmed = text.trim().toUpperCase();
        if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
          await pglite.exec(text);
          return { rows: [], command: trimmed, rowCount: 0, oid: 0, fields: [] };
        }
        if (trimmed.startsWith('SELECT') || trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE')) {
          const res = await pglite.query<R>(text);
          return {
            rows: res.rows || [],
            command: '',
            rowCount: res.rows?.length || 0,
            oid: 0,
            fields: [],
          };
        } else {
          await pglite.exec(text);
          return {
            rows: [],
            command: '',
            rowCount: 0,
            oid: 0,
            fields: [],
          };
        }
      }

      // If PGlite, cosine distance query
      const res = await pglite.query<R>(text, params);
      return {
        rows: res.rows || [],
        command: '',
        rowCount: res.rows?.length || 0,
        oid: 0,
        fields: [],
      };
    } catch (err) {
      console.error('[BridgeIQ AI-Worker DB] Query execution error:', err);
      throw err;
    }
  },

  async connect(): Promise<DbClient> {
    if (!probeCompleted) {
      await initializeDatabase();
    }

    if (!useEmbeddedMode) {
      try {
        const client = await pgPool.connect();
        return client;
      } catch (err: any) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.message?.includes('timeout')) {
          useEmbeddedMode = true;
        } else {
          throw err;
        }
      }
    }

    const pglite = getPGlite();
    return {
      async query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
        const res = await pglite.query<R>(text, params);
        return {
          rows: res.rows || [],
          command: '',
          rowCount: res.rows?.length || 0,
          oid: 0,
          fields: [],
        };
      },
      release() {
        // No-op
      },
    };
  },
};
