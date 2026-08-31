import express, { Express } from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import reportsRouter from './routes/reports';
import activitiesRouter from './routes/activities';
import matchesRouter from './routes/matches';
import auditLogRouter from './routes/auditLog';
import memoryRouter from './routes/memory';
import projectsRouter from './routes/projects';
import analyticsRouter from './routes/analytics';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/health', healthRouter);
  app.use('/projects', projectsRouter);
  app.use('/reports', reportsRouter);
  app.use('/activities', activitiesRouter);
  app.use('/matches', matchesRouter);
  app.use('/audit-log', auditLogRouter);
  app.use('/memory', memoryRouter);
  app.use('/analytics', analyticsRouter);

  return app;
};
