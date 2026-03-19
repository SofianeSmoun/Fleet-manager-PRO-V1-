import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import swaggerUi from 'swagger-ui-express';
import { authRouter } from './routes/auth.routes';
import { vehiclesRouter } from './routes/vehicles.routes';
import { swaggerSpec } from './lib/swagger';

const app: Express = express();
const PORT = process.env['PORT'] ?? 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min — global
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger docs (dev only)
if (process.env['NODE_ENV'] !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
}

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/vehicles', vehiclesRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`FleetManager API démarré sur le port ${String(PORT)}`);
});

export default app;
