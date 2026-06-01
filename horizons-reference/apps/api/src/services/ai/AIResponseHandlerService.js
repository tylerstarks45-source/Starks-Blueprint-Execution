import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIResponseHandlerService {
  constructor() {
    this.responseLog = [];
    this.maxLogEntries = 1000;
    this.initialized = true;
    logger.info('AIResponseHandlerService initialized');
  }

  parseOpenRouterResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be a valid object');
    }

    const parsed = {
      id: response.id || null,
      model: response.model || null,
      choices: response.choices || [],
      usage: response.usage || {},
      created: response.created || null,
      timestamp: new Date().toISOString(),
    };

    return parsed;
  }

  extractAIContent(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be a valid object');
    }

    if (!Array.isArray(response.choices) || response.choices.length === 0) {
      throw new Error('Response has no choices');
    }

    const choice = response.choices[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error('Response choice has no content');
    }

    return choice.message.content;
  }

  validateResponse(response) {
    if (!response || typeof response !== 'object') {
      return {
        valid: false,
        error: 'Response must be a valid object',
        code: 'INVALID_RESPONSE_TYPE',
      };
    }

    if (!response.choices || !Array.isArray(response.choices)) {
      return {
        valid: false,
        error: 'Response missing required field: choices',
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
    if (!choice || typeof choice !== 'object') {
      return {
        valid: false,
        error: 'First choice must be a valid object',
        code: 'INVALID_CHOICE',
      };
    }

    if (!choice.message || typeof choice.message !== 'object') {
      return {
        valid: false,
        error: 'Choice missing required field: message',
        code: 'MISSING_MESSAGE',
      };
    }

    if (!choice.message.content || typeof choice.message.content !== 'string') {
      return {
        valid: false,
        error: 'Message missing required field: content',
        code: 'MISSING_CONTENT',
      };
    }

    if (!response.usage || typeof response.usage !== 'object') {
      return {
        valid: false,
        error: 'Response missing required field: usage',
        code: 'MISSING_USAGE',
      };
    }

    return {
      valid: true,
      message: 'Response is valid',
      code: 'RESPONSE_VALID',
    };
  }

  handlePartialResponse(response) {
    if (!response || typeof response !== 'object') {
      return {
        complete: false,
        error: 'Response must be a valid object',
        code: 'INVALID_RESPONSE',
      };
    }

    const isComplete = response.choices && response.choices.length > 0 && response.choices[0].finish_reason === 'stop';

    return {
      complete: isComplete,
      finishReason: response.choices?.[0]?.finish_reason || null,
      content: response.choices?.[0]?.message?.content || '',
      timestamp: new Date().toISOString(),
    };
  }

  handleErrorResponse(response) {
    if (!response || typeof response !== 'object') {
      return {
        error: 'Unknown error',
        code: 'UNKNOWN_ERROR',
      };
    }

    return {
      error: response.error?.message || 'Unknown error',
      code: response.error?.code || 'UNKNOWN_ERROR',
      status: response.error?.status || null,
      timestamp: new Date().toISOString(),
    };
  }

  formatResponseForFrontend(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be a valid object');
    }

    const validation = this.validateResponse(response);
    if (!validation.valid) {
      throw new Error(`Invalid response: ${validation.error}`);
    }

    const content = this.extractAIContent(response);

    return {
      content,
      model: response.model || null,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: response.choices?.[0]?.finish_reason || null,
      timestamp: new Date().toISOString(),
    };
  }

  logResponse(response) {
    if (!response || typeof response !== 'object') {
      logger.warn('Invalid response for logging');
      return null;
    }

    const logEntry = {
      id: `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model: response.model || null,
      tokensUsed: response.usage?.total_tokens || 0,
      finishReason: response.choices?.[0]?.finish_reason || null,
      timestamp: new Date().toISOString(),
    };

    this.responseLog.push(logEntry);

    if (this.responseLog.length > this.maxLogEntries) {
      this.responseLog = this.responseLog.slice(-this.maxLogEntries);
    }

    logger.info(`Response logged: ${response.model} (${response.usage?.total_tokens || 0} tokens)`);

    return logEntry;
  }

  getResponseLog(limit = 100) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 100;
    }

    return {
      log: this.responseLog.slice(-limit),
      count: this.responseLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearResponseLog() {
    const clearedCount = this.responseLog.length;
    this.responseLog = [];
    logger.info(`Response log cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiResponseHandlerService = new AIResponseHandlerService();

export default aiResponseHandlerService;
export { AIResponseHandlerService };