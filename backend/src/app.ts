import express, { Express } from 'express';
import cors from 'cors';
import healthRouter from './routes/health';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/health', healthRouter);

  return app;
};
