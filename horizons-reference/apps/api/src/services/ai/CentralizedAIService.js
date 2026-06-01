import 'dotenv/config';
import openRouterConfigService from './OpenRouterConfigService.js';
import aiModelRegistryService from './AIModelRegistryService.js';
import aiTokenTrackingService from './AITokenTrackingService.js';
import aiRequestValidationService from './AIRequestValidationService.js';
import aiResponseHandlerService from './AIResponseHandlerService.js';
import aiErrorHandlingService from './AIErrorHandlingService.js';
import logger from '../../utils/logger.js';

class CentralizedAIService {
  constructor() {
    this.requestQueue = [];
    this.maxQueueSize = 1000;
    this.activeRequests = new Map();
    this.initialized = false;
    logger.info('CentralizedAIService initialized');
  }

  async sendAIRequest(prompt, model, options = {}) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    // Validate request
    const validation = aiRequestValidationService.validateRequestFormat({
      prompt,
      model,
      options,
    });

    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.error}`);
    }

    // Validate prompt
    const promptValidation = aiRequestValidationService.validatePrompt(prompt);
    if (!promptValidation.valid) {
      throw new Error(`Invalid prompt: ${promptValidation.error}`);
    }

    // Validate model
    const modelValidation = aiRequestValidationService.validateModel(model);
    if (!modelValidation.valid) {
      throw new Error(`Invalid model: ${modelValidation.error}`);
    }

    // Validate token limit
    const tokenValidation = aiRequestValidationService.validateTokenLimit(prompt, model);
    if (!tokenValidation.valid) {
      throw new Error(`Token limit exceeded: ${tokenValidation.error}`);
    }

    // Sanitize prompt
    const sanitizedPrompt = aiRequestValidationService.sanitizePrompt(prompt);

    // Check for abuse patterns
    const abuseCheck = aiRequestValidationService.checkForAbusePatterns(sanitizedPrompt);
    if (!abuseCheck.safe) {
      logger.warn(`Potential abuse pattern detected: ${abuseCheck.reason}`);
      throw new Error('Request contains potentially harmful content');
    }

    // Prepare request
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const requestData = {
      model,
      messages: [
        {
          role: 'user',
          content: sanitizedPrompt,
        },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      top_p: options.topP || 1,
    };

    // Check if OpenRouter is initialized
    if (!openRouterConfigService.isInitialized()) {
      throw new Error('OpenRouter is not initialized');
    }

    try {
      // Send request to OpenRouter
      const response = await fetch(`${openRouterConfigService.getOpenRouterConfig().baseUrl}/chat/completions`, {
        method: 'POST',
        headers: openRouterConfigService.getHeaders(),
        body: JSON.stringify(requestData),
        timeout: openRouterConfigService.getOpenRouterConfig().timeout,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(`OpenRouter API error: ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      const data = await response.json();

      // Validate response
      const responseValidation = aiResponseHandlerService.validateResponse(data);
      if (!responseValidation.valid) {
        throw new Error(`Invalid response: ${responseValidation.error}`);
      }

      // Extract content
      const content = aiResponseHandlerService.extractAIContent(data);

      // Log response
      aiResponseHandlerService.logResponse(data);

      logger.info(`AI request completed: ${requestId} (model: ${model})`);

      return {
        success: true,
        requestId,
        content,
        model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`AI request failed: ${error.message}`);
      const handledError = aiErrorHandlingService.handleOpenRouterError(error);
      throw new Error(handledError.message);
    }
  }

  getAvailableModels() {
    const models = aiModelRegistryService.getRegisteredModels();
    return {
      models,
      count: models.length,
      timestamp: new Date().toISOString(),
    };
  }

  getModelInfo(modelId) {
    if (!modelId || typeof modelId !== 'string') {
      throw new Error('Model ID is required and must be a string');
    }

    const model = aiModelRegistryService.getModelById(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return {
      model,
      timestamp: new Date().toISOString(),
    };
  }

  estimateTokenCost(prompt, model) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    // Rough estimation: ~4 characters per token
    const estimatedTokens = Math.ceil(prompt.length / 4);

    const modelInfo = aiModelRegistryService.getModelById(model);
    if (!modelInfo) {
      throw new Error(`Model not found: ${model}`);
    }

    const costInfo = aiModelRegistryService.getModelCostInfo(model);
    const estimatedCost = (estimatedTokens * costInfo.inputCostPerToken).toFixed(6);

    return {
      prompt,
      model,
      estimatedTokens,
      estimatedCost: parseFloat(estimatedCost),
      costInfo,
      timestamp: new Date().toISOString(),
    };
  }

  trackAIUsage(userId, model, tokensUsed, cost) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    if (typeof tokensUsed !== 'number' || tokensUsed < 0) {
      throw new Error('Tokens used must be a non-negative number');
    }

    if (typeof cost !== 'number' || cost < 0) {
      throw new Error('Cost must be a non-negative number');
    }

    const tracked = aiTokenTrackingService.trackTokenUsage(userId, model, 0, tokensUsed, cost);
    logger.info(`AI usage tracked: ${userId} - ${model} (${tokensUsed} tokens, $${cost})`);

    return tracked;
  }

  getAIUsageStats(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const stats = aiTokenTrackingService.getTokenUsageByUser(userId);
    return stats;
  }

  validateAIRequest(prompt, model) {
    if (!prompt || typeof prompt !== 'string') {
      return {
        valid: false,
        error: 'Prompt is required and must be a string',
        code: 'INVALID_PROMPT',
      };
    }

    if (!model || typeof model !== 'string') {
      return {
        valid: false,
        error: 'Model is required and must be a string',
        code: 'INVALID_MODEL',
      };
    }

    const promptValidation = aiRequestValidationService.validatePrompt(prompt);
    if (!promptValidation.valid) {
      return {
        valid: false,
        error: promptValidation.error,
        code: 'INVALID_PROMPT',
      };
    }

    const modelValidation = aiRequestValidationService.validateModel(model);
    if (!modelValidation.valid) {
      return {
        valid: false,
        error: modelValidation.error,
        code: 'INVALID_MODEL',
      };
    }

    return {
      valid: true,
      message: 'Request is valid',
      code: 'REQUEST_VALID',
      timestamp: new Date().toISOString(),
    };
  }

  handleAIResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be a valid object');
    }

    const validation = aiResponseHandlerService.validateResponse(response);
    if (!validation.valid) {
      throw new Error(`Invalid response: ${validation.error}`);
    }

    const content = aiResponseHandlerService.extractAIContent(response);
    const formatted = aiResponseHandlerService.formatResponseForFrontend(response);

    return {
      success: true,
      content,
      formatted,
      timestamp: new Date().toISOString(),
    };
  }

  handleAIError(error) {
    if (!error) {
      return {
        success: false,
        error: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
      };
    }

    const handled = aiErrorHandlingService.handleOpenRouterError(error);
    aiErrorHandlingService.logError(error);

    return {
      success: false,
      error: handled.message,
      code: handled.code,
      timestamp: new Date().toISOString(),
    };
  }

  getServiceStatus() {
    return {
      initialized: openRouterConfigService.isInitialized(),
      openRouterStatus: openRouterConfigService.getOpenRouterStatus(),
      registeredModels: aiModelRegistryService.getRegisteredModels().length,
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const centralizedAIService = new CentralizedAIService();

export default centralizedAIService;
export { CentralizedAIService };