import express from 'express';
import openRouterController from '../../controllers/ai/OpenRouterController.js';
import logger from '../../utils/logger.js';

const router = express.Router();

logger.info('Initializing OpenRouter routes');

// POST /openrouter/request - Send AI request to OpenRouter
router.post('/request', async (req, res, next) => {
  try {
    logger.info('POST /openrouter/request endpoint called');
    await openRouterController.sendRequest(req, res);
  } catch (error) {
    logger.error(`AI request error: ${error.message}`);
    next(error);
  }
});

// GET /openrouter/models - Get available models
router.get('/models', async (req, res, next) => {
  try {
    logger.info('GET /openrouter/models endpoint called');
    await openRouterController.getModels(req, res);
  } catch (error) {
    logger.error(`Models list error: ${error.message}`);
    next(error);
  }
});

// GET /openrouter/health - Get provider health status
router.get('/health', async (req, res, next) => {
  try {
    logger.info('GET /openrouter/health endpoint called');
    await openRouterController.getHealth(req, res);
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    next(error);
  }
});

logger.info('OpenRouter routes initialized successfully');

export default router;