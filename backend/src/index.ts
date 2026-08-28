import dotenv from 'dotenv';
import { createApp } from './app';
import { ensureDatabaseSchema } from './migrate';

dotenv.config();

const port = process.env.PORT || 4000;
const app = createApp();

async function startServer() {
  await ensureDatabaseSchema();

  app.listen(port, () => {
    console.log(`[BridgeIQ Backend] Server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[BridgeIQ Backend] Fatal error during startup:', err);
  process.exit(1);
});
