import express from 'express';
import { requireAuthenticatedUser } from '../../middleware/authenticatedResourceAccess.js';
import centralizedAIService from '../../services/ai/CentralizedAIService.js';
import aiTokenTrackingService from '../../services/ai/AITokenTrackingService.js';
import aiModelRegistryService from '../../services/ai/AIModelRegistryService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuthenticatedUser());

// POST /request - Send AI request through centralized service
router.post('/request', async (req, res) => {
  const { prompt, model, options } = req.body;
  const userId = req.authenticatedUserId || req.user?.id || req.auth?.id;

  if (!prompt) {
    return res.status(400).json({
      error: 'Prompt is required',
      code: 'MISSING_PROMPT',
    });
  }

  if (!model) {
    return res.status(400).json({
      error: 'Model is required',
      code: 'MISSING_MODEL',
    });
  }

  if (typeof prompt !== 'string') {
    return res.status(400).json({
      error: 'Prompt must be a string',
      code: 'INVALID_PROMPT_TYPE',
    });
  }

  if (typeof model !== 'string') {
    return res.status(400).json({
      error: 'Model must be a string',
      code: 'INVALID_MODEL_TYPE',
    });
  }

  // Validate request through centralized service
  const validation = centralizedAIService.validateAIRequest(prompt, model);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      code: validation.code,
    });
  }

  // Send request through centralized service
  const aiResponse = await centralizedAIService.sendAIRequest(prompt, model, options || {});

  // Calculate cost
  const modelInfo = aiModelRegistryService.getModelById(model);
  const inputCost = (aiResponse.usage.promptTokens * modelInfo.inputCostPerToken);
  const outputCost = (aiResponse.usage.completionTokens * modelInfo.outputCostPerToken);
  const totalCost = inputCost + outputCost;

  // Track usage
  aiTokenTrackingService.trackTokenUsage(
    userId,
    model,
    aiResponse.usage.promptTokens,
    aiResponse.usage.completionTokens,
    totalCost
  );

  logger.info(`AI request completed for user: ${userId} (model: ${model}, tokens: ${aiResponse.usage.totalTokens})`);

  res.json({
    status: 'success',
    data: {
      response: aiResponse.content,
      model: aiResponse.model,
      tokensUsed: aiResponse.usage.totalTokens,
      cost: parseFloat(totalCost.toFixed(6)),
      usage: {
        promptTokens: aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
        totalTokens: aiResponse.usage.totalTokens,
      },
    },
    timestamp: aiResponse.timestamp,
  });
});

export default router;