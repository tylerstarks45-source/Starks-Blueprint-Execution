import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import logger from './utils/logger.js';
import { BodyLimit } from './constants/common.js';

const app = express();

app.set('trust proxy', true);

logger.info('========== EXPRESS SERVER INITIALIZATION ==========');
logger.info('Initializing Express.js server...');

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');

	await new Promise(resolve => setTimeout(resolve, 3000));

	logger.info('Exiting');
	process.exit();
});

logger.info('Applying security middleware (helmet)...');
app.use(helmet());

logger.info('Applying CORS middleware...');
app.use(cors({
	origin: process.env.CORS_ORIGIN,
	credentials: true,
}));

logger.info('Applying request logging middleware (morgan)...');
app.use(morgan('combined'));

logger.info('Applying global rate limiting middleware...');
app.use(globalRateLimit);

logger.info('Applying JSON body parser middleware...');
app.use(express.json({
	limit: BodyLimit,
}));

logger.info('Applying URL-encoded body parser middleware...');
app.use(express.urlencoded({ 
	extended: true,
	limit: BodyLimit,
}));

logger.info('========== EXPRESS JSON MIDDLEWARE ENABLED ==========');
logger.info('JSON body parser is active and ready to parse application/json requests');

logger.info('Registering routes...');
app.use('/', routes());

logger.info('Applying error handling middleware...');
app.use(errorMiddleware);

app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 3001;

logger.info('========== SERVER STARTUP ==========');
app.listen(port, () => {
	logger.info(`🚀 API Server running on http://localhost:${port}`);
	logger.info('========== SERVER READY ==========');
});

export default app;