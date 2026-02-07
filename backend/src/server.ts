import { app } from './app';
import { env } from './config/env';
import { startQueueWorker } from './services/queueWorker';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
    console.log(`🚀 LedgerSnap Backend running on port ${PORT}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
});

const stopQueueWorker = startQueueWorker();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    stopQueueWorker();
    server.close(() => {
        console.log('HTTP server closed');
    });
});
