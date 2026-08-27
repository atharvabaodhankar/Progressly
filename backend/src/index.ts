import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`[BridgeIQ Backend] Server listening on http://localhost:${port}`);
});
