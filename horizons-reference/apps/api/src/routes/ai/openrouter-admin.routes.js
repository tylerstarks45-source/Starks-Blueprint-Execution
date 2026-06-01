import express from 'express';
import { requireSuperAdmin } from '../../middleware/superAdminProtection.js';
import openRouterConfigService from '../../services/ai/OpenRouterConfigService.js';
import aiModelRegistryService from '../../services/ai/AIModelRegistryService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply Super Admin protection to all routes
router.use(requireSuperAdmin());

// POST /initialize - Initialize OpenRouter with API key
router.post('/initialize', async (req, res) => {
  const { apiKey } = req.body;
  const adminId = req.user?.id || req.auth?.id;

  if (!apiKey) {
    return res.status(400).json({
      error: 'API key is required',
      code: 'MISSING_API_KEY',
    });
  }

  const result = openRouterConfigService.initializeOpenRouter(apiKey);

  logger.info(`OpenRouter initialized by admin: ${adminId}`);

  res.json({
    status: 'success',
    message: result.message,
    timestamp: result.timestamp,
  });
});

// GET /status - Get OpenRouter connection status
router.get('/status', async (req, res) => {
  const status = openRouterConfigService.getOpenRouterStatus();

  res.json({
    status: 'success',
    data: status,
    timestamp: new Date().toISOString(),
  });
});

// GET /models - List all available models
router.get('/models', async (req, res) => {
  const models = aiModelRegistryService.getRegisteredModels();

  res.json({
    status: 'success',
    data: {
      models,
      count: models.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// GET /models/:modelId - Get specific model details
router.get('/models/:modelId', async (req, res) => {
  const { modelId } = req.params;

  if (!modelId) {
    return res.status(400).json({
      error: 'Model ID is required',
      code: 'MISSING_MODEL_ID',
    });
  }

  const model = aiModelRegistryService.getModelById(modelId);

  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  res.json({
    status: 'success',
    data: model,
    timestamp: new Date().toISOString(),
  });
});

// POST /test-connection - Test OpenRouter connection
router.post('/test-connection', async (req, res) => {
  const adminId = req.user?.id || req.auth?.id;

  const validation = await openRouterConfigService.validateOpenRouterConnection();

  if (!validation.valid) {
    throw new Error(`OpenRouter connection validation failed: ${validation.error}`);
  }

  logger.info(`OpenRouter connection test successful by admin: ${adminId}`);

  res.json({
    status: 'success',
    data: validation,
    timestamp: new Date().toISOString(),
  });
});

export default router;