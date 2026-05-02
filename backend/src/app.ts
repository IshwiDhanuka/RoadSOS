import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { getEnv } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import servicesRoutes from './routes/services';
import offlineRoutes from './routes/offline';
import sosRoutes from './routes/sos';
import reportRoutes from './routes/report';
import { Router } from 'express';
import { asyncHandler } from './middleware/errorHandler';
import { meshRelay } from './controllers/sosController';

export function createApp(): express.Application {
  /** Creates and configures the Express application with the full middleware stack:
   *  - Helmet for secure HTTP headers (OWASP A05)
   *  - CORS with configurable origin whitelist
   *  - Global rate limiter at 100 req/min per IP (defence-in-depth)
   *  - JSON body parser capped at 256kb to prevent payload DoS
   *  - gzip compression for responses
   *  - Lightweight request logger to stdout
   *  - All 7 route groups mounted at their respective paths
   *  - Mesh relay on a separate mount with its own 20 req/min rate limiter
   *  - 404 catch-all and global error handler (must be last) */
  const app = express();
  const env = getEnv();

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Rate limit exceeded. Please slow down.' },
    }),
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use(compression());

  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  app.use('/health', healthRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/offline', offlineRoutes);
  app.use('/api/sos', sosRoutes);
  app.use('/api/report', reportRoutes);

  const meshRouter = Router();
  const meshLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many mesh relay requests.' },
  });
  meshRouter.post('/relay', meshLimiter, asyncHandler(meshRelay));
  app.use('/api/mesh', meshRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  app.use(errorHandler);

  return app;
}
