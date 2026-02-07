import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { rateLimit } from './middleware/rateLimit';

// Route imports (to be created)
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';
import receiptRoutes from './routes/receipts';
import statementRoutes from './routes/statements';
import healthRoutes from './routes/health';
import submissionsRoutes from './routes/submissions';

export const app = express();

// Middleware
app.use(cors({ origin: env.APP_BASE_URL })); // Lock CORS to frontend
app.use(express.json({ limit: '10mb' })); // Support large image payloads
app.use(morgan('dev')); // Logging
app.use(rateLimit);

// Health Check
app.use('/health', healthRoutes);

// Routes (Mounting)
app.use('/auth', authRoutes);
app.use('/tenants', tenantRoutes);
app.use('/receipts', receiptRoutes);
app.use('/statements', statementRoutes);
app.use('/submissions', submissionsRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});
