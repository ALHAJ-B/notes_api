import express from 'express';
import os from 'node:os';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from '../routes/authRoutes.js';
import noteRoute from '../routes/notesRoute.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { requestContext } from '../middleware/requestContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

export function createApp() {
  const app = express();

  const options = {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['html', 'htm'],
    index: 'index.html',
    maxAge: 0,
    redirect: false,
    setHeaders(res) {
      res.set('x-timestamp', Date.now());
    },
  };

  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));
  app.use(requestContext);

  app.use(express.static(path.join(projectRoot, 'frontend/public'), options));
  app.use('/src', express.static(path.join(projectRoot, 'frontend/src')));

  app.use('/api/auth', authRateLimiter, authRoutes);
  app.use('/api/notes', authMiddleware, noteRoute);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      uptime: Math.floor(process.uptime())
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
