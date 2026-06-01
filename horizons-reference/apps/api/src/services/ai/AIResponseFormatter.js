import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIResponseFormatter {
  constructor() {
    this.initialized = true;
    logger.info('AIResponseFormatter initialized');
  }

  formatSuccess(openrouterResponse, model, usage) {
    if (!openrouterResponse || typeof openrouterResponse !== 'object') {
      throw new Error('OpenRouter response is required and must be an object');
    }

    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    if (!usage || typeof usage !== 'object') {
      throw new Error('Usage is required and must be an object');
    }

    // Extract message content
    let message = '';
    if (openrouterResponse.choices && openrouterResponse.choices.length > 0) {
      message = openrouterResponse.choices[0].message?.content || '';
    }

    const formatted = {
      success: true,
      message,
      model,
      tokens_used: {
        input: usage.input_tokens || 0,
        output: usage.output_tokens || 0,
        total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Response formatted successfully for model: ${model}`);
    return formatted;
  }

  formatError(error, context = {}) {
    if (!error) {
      throw new Error('Error is required');
    }

    const errorMessage = error.message || 'Unknown error occurred';
    const errorCode = error.code || 'UNKNOWN_ERROR';

    // Ensure API key is never exposed
    const safeMessage = this.sanitizeErrorMessage(errorMessage);

    const formatted = {
      success: false,
      error: safeMessage,
      code: errorCode,
      context: {
        model: context.model || 'unknown',
        timestamp: context.timestamp || new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    logger.error(`Error formatted: ${errorCode} - ${safeMessage}`);
    return formatted;
  }

  validateResponseStructure(response) {
    if (!response || typeof response !== 'object') {
      return {
        valid: false,
        error: 'Response must be a valid object',
        code: 'INVALID_RESPONSE_TYPE',
      };
    }

    // Check required fields
    if (!response.choices || !Array.isArray(response.choices)) {
      return {
        valid: false,
        error: 'Response missing required field: choices (array)',
        code: 'MISSING_CHOICES',
      };
    }

    if (response.choices.length === 0) {
      return {
        valid: false,
        error: 'Response choices array is empty',
        code: 'EMPTY_CHOICES',
      };
    }

    const choice = response.choices[0];
    if (!choice.message || typeof choice.message !== 'object') {
      return {
        valid: false,
        error: 'Response choice missing required field: message (object)',
        code: 'MISSING_MESSAGE',
      };
    }

    if (!choice.message.content || typeof choice.message.content !== 'string') {
      return {
        valid: false,
        error: 'Response message missing required field: content (string)',
        code: 'MISSING_CONTENT',
      };
    }

    if (!response.usage || typeof response.usage !== 'object') {
      return {
        valid: false,
        error: 'Response missing required field: usage (object)',
        code: 'MISSING_USAGE',
      };
    }

    if (typeof response.usage.prompt_tokens !== 'number') {
      return {
        valid: false,
        error: 'Response usage missing required field: prompt_tokens (number)',
        code: 'MISSING_PROMPT_TOKENS',
      };
    }

    if (typeof response.usage.completion_tokens !== 'number') {
      return {
        valid: false,
        error: 'Response usage missing required field: completion_tokens (number)',
        code: 'MISSING_COMPLETION_TOKENS',
      };
    }

    if (!response.model || typeof response.model !== 'string') {
      return {
        valid: false,
        error: 'Response missing required field: model (string)',
        code: 'MISSING_MODEL',
      };
    }

    logger.info('Response structure validation passed');
    return {
      valid: true,
      message: 'Response structure is valid',
      code: 'VALID_RESPONSE',
    };
  }

  sanitizeErrorMessage(message) {
    if (!message || typeof message !== 'string') {
      return 'An error occurred';
    }

    // Remove API key patterns
    let sanitized = message.replace(/sk-[a-zA-Z0-9-]+/g, '[REDACTED]');
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9-]+/g, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/Authorization:\s*[a-zA-Z0-9-]+/g, 'Authorization: [REDACTED]');

    // Remove sensitive headers
    sanitized = sanitized.replace(/X-API-Key:\s*[a-zA-Z0-9-]+/g, 'X-API-Key: [REDACTED]');
    sanitized = sanitized.replace(/api[_-]?key[=:]*[a-zA-Z0-9-]+/gi, 'api_key=[REDACTED]');

    return sanitized;
  }
}

const aiResponseFormatter = new AIResponseFormatter();

export default aiResponseFormatter;
export { AIResponseFormatter };