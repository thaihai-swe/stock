import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { DIST_DIR } from './config/constants.js';

import orderRoutes from './routes/orderRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import priceRoutes from './routes/priceRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import dividendRoutes from './routes/dividendRoutes.js';
import fundamentalRoutes from './routes/fundamentalRoutes.js';
import valuationRoutes from './routes/valuationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// API Routes
app.use('/api', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', watchlistRoutes);
app.use('/api', priceRoutes);
app.use('/api', settingsRoutes);
app.use('/api', dividendRoutes);
app.use('/api', fundamentalRoutes);
app.use('/api', valuationRoutes);

import { getDbInfo } from './storage/db.js';
import { isPythonAvailable } from './utils/pythonRunner.js';

// Health check & Environment info endpoint
app.get('/api/health', (req, res) => {
  const isVercel = Boolean(process.env.VERCEL);
  const canRunPipeline = isPythonAvailable();
  res.json({
    status: 'ok',
    environment: isVercel ? 'production' : 'local',
    isLocal: !isVercel,
    canRunPipeline,
    label: isVercel ? 'Vercel Serverless (Production)' : 'Local Express Server (Port ' + (process.env.PORT || 3001) + ')',
    database: getDbInfo(),
    time: new Date().toISOString(),
  });
});

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Bắt các route /api/* không tồn tại
app.use('/api/*', notFoundHandler);

// Middleware xử lý lỗi toàn cục
app.use(errorHandler);

// Serve React build (khi chạy local độc lập hoặc Docker)
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

export default app;
