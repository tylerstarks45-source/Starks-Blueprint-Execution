import 'dotenv/config';
import logger from '../../utils/logger.js';
import aiRequestValidator from './AIRequestValidator.js';
import aiResponseParser from './AIResponseParser.js';
import aiRequestLogger from './AIRequestLogger.js';
import openRouterService from '../ai/OpenRouterService.js';

class AIRequestPipeline {
  constructor() {
    this.initialized = true;
    logger.info('AIRequestPipeline initialized');
  }

  async processRequest(requestData) {
    const { prompt, model, temperature, maxTokens, systemPrompt, userId } = requestData;

    if (!userId) {
      logger.error('Pipeline error: userId is required');
      return {
        success: false,
        error: 'User ID is required',
        details: 'userId must be provided in request data',
      };
    }

    // Step 1: Validate inputs
    logger.debug('Pipeline step 1: Validating inputs');
    const validation = aiRequestValidator.validateRequest(
      prompt,
      model,
      systemPrompt,
      temperature,
      maxTokens
    );

    if (!validation.valid) {
      logger.warn(`Pipeline validation failed: ${validation.errors.join('; ')}`);
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      };
    }

    // Sanitize inputs
    const sanitized = aiRequestValidator.sanitizeRequest(prompt, model, systemPrompt);

    // Step 2: Log request start
    logger.debug('Pipeline step 2: Logging request start');
    const requestLog = aiRequestLogger.logRequestStart(
      userId,
      sanitized.prompt,
      sanitized.model,
      temperature || 0.7,
      maxTokens || 2048
    );

    const requestId = requestLog?.id || `req-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Step 3: Prepare OpenRouter payload
      logger.debug('Pipeline step 3: Preparing OpenRouter payload');
      const payload = this.preparePayload(
        sanitized.prompt,
        sanitized.model,
        sanitized.systemPrompt,
        temperature || 0.7,
        maxTokens || 2048
      );

      // Step 4: Send request to OpenRouter
      logger.debug('Pipeline step 4: Sending request to OpenRouter');
      const openRouterResponse = await openRouterService.sendRequest(payload);

      // Step 5: Parse response
      logger.debug('Pipeline step 5: Parsing response');
      const parsedResponse = aiResponseParser.parseResponse(openRouterResponse);

      // Step 6: Calculate duration
      const duration = Date.now() - startTime;

      // Step 7: Log request completion
      logger.debug('Pipeline step 7: Logging request completion');
      aiRequestLogger.logRequestCompletion(
        requestId,
        userId,
        sanitized.model,
        duration,
        parsedResponse.tokens,
        parsedResponse.provider
      );

      // Step 8: Return structured response
      logger.info(`Pipeline completed successfully: requestId=${requestId}, duration=${duration}ms`);
      return {
        success: true,
        data: {
          response: parsedResponse.text,
          model: parsedResponse.model,
          provider: parsedResponse.provider,
          tokens: parsedResponse.tokens,
          duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      // Handle errors at any stage
      const duration = Date.now() - startTime;

      logger.error(`Pipeline error: ${error.message}`);
      aiRequestLogger.logError(
        userId,
        model,
        error.name || 'UnknownError',
        error.message
      );

      // Determine error type and status code
      let statusCode = 500;
      let errorType = 'SERVER_ERROR';

      if (error.message.includes('API key')) {
        statusCode = 401;
        errorType = 'AUTH_ERROR';
      } else if (error.message.includes('rate limit')) {
        statusCode = 429;
        errorType = 'RATE_LIMIT_ERROR';
      } else if (error.message.includes('timeout')) {
        statusCode = 504;
        errorType = 'TIMEOUT_ERROR';
      } else if (error.message.includes('not found')) {
        statusCode = 404;
        errorType = 'NOT_FOUND_ERROR';
      }

      return {
        success: false,
        error: error.message,
        details: {
          errorType,
          statusCode,
          duration,
          requestId,
        },
      };
    }
  }

  preparePayload(prompt, model, systemPrompt, temperature, maxTokens) {
    const messages = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add user prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    return {
      model,
      messages,
      temperature: temperature || 0.7,
      max_tokens: maxTokens || 2048,
    };
  }

  getRequestHistory(userId, limit = 50) {
    return aiRequestLogger.getRequestHistory(userId, limit);
  }

  getRequestStats(userId) {
    return aiRequestLogger.getRequestStats(userId);
  }

  getErrorHistory(userId, limit = 50) {
    return aiRequestLogger.getErrorHistory(userId, limit);
  }
}

const aiRequestPipeline = new AIRequestPipeline();

export default aiRequestPipeline;
export { AIRequestPipeline };