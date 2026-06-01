import express from 'express';
import logger from '../utils/logger.js';
import aiRequestRoutes from './requests/ai-request.routes.js';
import creditsRoutes from './credits/credits.routes.js';

logger.info('Initializing route index');

export default function routes() {
  const router = express.Router();

  // Register AI request routes at /requests path
  router.use('/requests', aiRequestRoutes);
  
  // Register credits routes
  router.use('/credits', creditsRoutes);

  logger.info('Route index initialized successfully');
  return router;
}