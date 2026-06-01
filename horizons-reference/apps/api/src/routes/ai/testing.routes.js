import express from 'express';
import OpenRouterService from '../../services/ai/OpenRouterService.js';
import validator from '../../utils/openrouter-validator.js';
import logger from '../../utils/logger.js';

const router = express.Router();

let openRouterService = null;
try {
  openRouterService = new OpenRouterService();
} catch (error) {
  logger.warn('OpenRouter service initialization warning:', error.message);
}

const supportedModels = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'openai/gpt-4-turbo',
  'openai/gpt-4o',
  'google/gemini-2.0-flash',
  'deepseek/deepseek-r1',
];

const modelNames = {
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'anthropic/claude-3-opus': 'Claude 3 Opus',
  'openai/gpt-4-turbo': 'GPT-4 Turbo',
  'openai/gpt-4o': 'GPT-4o',
  'google/gemini-2.0-flash': 'Gemini 2.0 Flash',
  'deepseek/deepseek-r1': 'DeepSeek R1',
};

// POST /test-all-models - Test all supported models
router.post('/test-all-models', async (req, res) => {
  if (!openRouterService) {
    throw new Error('OpenRouter service not initialized. Set OPENROUTER_API_KEY environment variable.');
  }

  const testPrompt = 'Test';
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const model of supportedModels) {
    const startTime = Date.now();
    try {
      const testMessages = [{ role: 'user', content: testPrompt }];
      await openRouterService.makeRealRequest(
        model,
        testMessages,
        { maxTokens: 100, retries: 1 }
      );

      const responseTime = Date.now() - startTime;
      results.push({
        model: modelNames[model] || model,
        modelId: model,
        status: 'success',
        responseTime,
        error: null,
      });
      successCount += 1;
      logger.info(`Model test successful: ${model} (${responseTime}ms)`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const categorized = validator.categorizeError(error);
      results.push({
        model: modelNames[model] || model,
        modelId: model,
        status: 'failed',
        responseTime,
        error: validator.getSafeErrorMessage(error),
        errorCategory: categorized.category,
      });
      failedCount += 1;
      logger.warn(`Model test failed: ${model} - ${categorized.category}`);
    }
  }

  const response = {
    results,
    summary: {
      totalModels: supportedModels.length,
      successCount,
      failedCount,
      timestamp: new Date().toISOString(),
    },
  };

  logger.info(`All models tested: ${successCount} success, ${failedCount} failed`);
  res.json(response);
});

// POST /test-prompt-validation - Validate and estimate tokens for a prompt
router.post('/test-prompt-validation', async (req, res) => {
  const { prompt, model } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Prompt parameter is required',
      code: 'MISSING_PROMPT',
    });
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({
      error: 'Prompt must be a non-empty string',
      code: 'INVALID_PROMPT',
    });
  }

  const warnings = [];

  // Validate model if provided
  if (model && !supportedModels.includes(model)) {
    warnings.push(`Model not in supported list: ${model}`);
  }

  // Rough token estimation: ~4 characters per token
  const estimatedTokenCount = Math.ceil(prompt.length / 4);

  // Check for potential issues
  if (estimatedTokenCount > 100000) {
    warnings.push('Prompt is very long and may exceed model token limits');
  }

  if (prompt.length > 500000) {
    warnings.push('Prompt exceeds 500,000 characters');
  }

  const response = {
    valid: true,
    tokenCount: estimatedTokenCount,
    promptLength: prompt.length,
    warnings,
    timestamp: new Date().toISOString(),
  };

  logger.info(`Prompt validation completed: ${estimatedTokenCount} estimated tokens`);
  res.json(response);
});

// GET /error-history - Get recent error history
router.get('/error-history', async (req, res) => {
  if (!openRouterService) {
    return res.json({
      errors: [],
      summary: {
        totalErrors: 0,
        byCategory: {},
      },
      message: 'OpenRouter service not initialized',
      timestamp: new Date().toISOString(),
    });
  }

  const errors = openRouterService.getErrorHistory(50);

  // Categorize errors
  const byCategory = {
    network: 0,
    timeout: 0,
    rateLimit: 0,
    invalidModel: 0,
    malformedResponse: 0,
    apiError: 0,
    other: 0,
  };

  errors.forEach(error => {
    const category = error.category || 'other';
    if (category === 'NETWORK_ERROR') byCategory.network += 1;
    else if (category === 'TIMEOUT_ERROR') byCategory.timeout += 1;
    else if (category === 'RATE_LIMIT_ERROR') byCategory.rateLimit += 1;
    else if (category === 'INVALID_MODEL_ERROR') byCategory.invalidModel += 1;
    else if (category === 'MALFORMED_RESPONSE_ERROR') byCategory.malformedResponse += 1;
    else if (category === 'API_ERROR') byCategory.apiError += 1;
    else byCategory.other += 1;
  });

  const response = {
    errors: errors.map(error => ({
      timestamp: error.timestamp,
      category: error.category,
      message: error.message,
      model: error.model,
      retryable: validator.categorizeError({ message: error.message, code: error.category }).retryable,
    })),
    summary: {
      totalErrors: errors.length,
      byCategory,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(`Error history retrieved: ${errors.length} errors`);
  res.json(response);
});

// GET /request-history - Get recent request history
router.get('/request-history', async (req, res) => {
  if (!openRouterService) {
    return res.json({
      requests: [],
      summary: {
        totalRequests: 0,
        averageTokens: 0,
        averageResponseTime: 0,
      },
      message: 'OpenRouter service not initialized',
      timestamp: new Date().toISOString(),
    });
  }

  const requests = openRouterService.getRequestHistory(50);
  const usageStats = openRouterService.getUsageStats();

  let totalTokens = 0;
  let totalResponseTime = 0;

  requests.forEach(req => {
    totalResponseTime += req.responseTime || 0;
  });

  usageStats.recentRequests.forEach(usage => {
    totalTokens += usage.totalTokens || 0;
  });

  const averageTokens = requests.length > 0 ? Math.round(totalTokens / requests.length) : 0;
  const averageResponseTime = requests.length > 0 ? Math.round(totalResponseTime / requests.length) : 0;

  const response = {
    requests: requests.map(req => ({
      timestamp: req.timestamp,
      model: req.model,
      messageCount: req.messageCount,
      responseTime: req.responseTime,
      status: req.status,
      finishReason: req.finishReason,
    })),
    summary: {
      totalRequests: requests.length,
      averageTokens,
      averageResponseTime,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(`Request history retrieved: ${requests.length} requests`);
  res.json(response);
});

// POST /clear-usage-stats - Clear usage statistics
router.post('/clear-usage-stats', async (req, res) => {
  if (!openRouterService) {
    return res.status(503).json({
      success: false,
      message: 'OpenRouter service not initialized',
      timestamp: new Date().toISOString(),
    });
  }

  const result = openRouterService.clearUsageStats();

  const response = {
    success: true,
    message: 'Usage statistics cleared',
    cleared: {
      usageEntries: result.clearedUsage,
      requests: result.clearedRequests,
      errors: result.clearedErrors,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(`Usage statistics cleared: ${result.clearedUsage} usage, ${result.clearedRequests} requests, ${result.clearedErrors} errors`);
  res.json(response);
});

export default router;