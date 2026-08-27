import express, { Express } from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import reportsRouter from './routes/reports';
import activitiesRouter from './routes/activities';
import matchesRouter from './routes/matches';
import auditLogRouter from './routes/auditLog';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/health', healthRouter);
  app.use('/reports', reportsRouter);
  app.use('/activities', activitiesRouter);
  app.use('/matches', matchesRouter);
  app.use('/audit-log', auditLogRouter);

  return app;
};
