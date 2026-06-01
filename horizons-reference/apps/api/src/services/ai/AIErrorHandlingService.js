import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIErrorHandlingService {
  constructor() {
    this.errorLog = [];
    this.maxLogEntries = 1000;
    this.initialized = true;
    logger.info('AIErrorHandlingService initialized');
  }

  handleOpenRouterError(error) {
    if (!error) {
      return {
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR',
        retryable: false,
      };
    }

    const categorized = this.categorizeError(error);
    const safeMessage = this.getSafeErrorMessage(categorized.category);

    return {
      message: safeMessage,
      code: categorized.code,
      category: categorized.category,
      retryable: categorized.retryable,
      timestamp: new Date().toISOString(),
    };
  }

  handleRateLimitError(error) {
    logger.warn('Rate limit error encountered');

    return {
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMIT_ERROR',
      category: 'RATE_LIMIT',
      retryable: true,
      retryAfter: error.retryAfter || 60,
      timestamp: new Date().toISOString(),
    };
  }

  handleAuthenticationError(error) {
    logger.error('Authentication error encountered');

    return {
      message: 'Authentication failed. Please check your configuration.',
      code: 'AUTH_ERROR',
      category: 'AUTHENTICATION',
      retryable: false,
      timestamp: new Date().toISOString(),
    };
  }

  handleModelNotFoundError(error) {
    logger.warn('Model not found error encountered');

    return {
      message: 'The specified model is not available.',
      code: 'MODEL_NOT_FOUND',
      category: 'MODEL_ERROR',
      retryable: false,
      timestamp: new Date().toISOString(),
    };
  }

  handleTokenLimitError(error) {
    logger.warn('Token limit error encountered');

    return {
      message: 'Request exceeds token limit. Please use a shorter prompt.',
      code: 'TOKEN_LIMIT_ERROR',
      category: 'TOKEN_ERROR',
      retryable: false,
      timestamp: new Date().toISOString(),
    };
  }

  handleNetworkError(error) {
    logger.error('Network error encountered');

    return {
      message: 'Network connection failed. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      category: 'NETWORK',
      retryable: true,
      timestamp: new Date().toISOString(),
    };
  }

  categorizeError(error) {
    if (!error) {
      return {
        category: 'UNKNOWN_ERROR',
        code: 'UNKNOWN_ERROR',
        retryable: false,
      };
    }

    const errorMsg = error.message || '';
    const errorCode = error.code || '';
    const status = error.status || null;

    // Network errors
    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ENETUNREACH') {
      return {
        category: 'NETWORK_ERROR',
        code: 'NETWORK_ERROR',
        retryable: true,
      };
    }

    // Timeout errors
    if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT' || errorMsg.includes('timeout')) {
      return {
        category: 'TIMEOUT_ERROR',
        code: 'TIMEOUT_ERROR',
        retryable: true,
      };
    }

    // Rate limit errors
    if (status === 429 || errorMsg.includes('rate limit')) {
      return {
        category: 'RATE_LIMIT_ERROR',
        code: 'RATE_LIMIT_ERROR',
        retryable: true,
      };
    }

    // Invalid model errors
    if (status === 404 || errorMsg.includes('model') || errorMsg.includes('not found')) {
      return {
        category: 'MODEL_NOT_FOUND',
        code: 'MODEL_NOT_FOUND',
        retryable: false,
      };
    }

    // Authentication errors
    if (status === 401 || status === 403 || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
      return {
        category: 'AUTH_ERROR',
        code: 'AUTH_ERROR',
        retryable: false,
      };
    }

    // Bad request errors
    if (status === 400 || errorMsg.includes('bad request')) {
      return {
        category: 'BAD_REQUEST_ERROR',
        code: 'BAD_REQUEST_ERROR',
        retryable: false,
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        category: 'SERVER_ERROR',
        code: 'SERVER_ERROR',
        retryable: true,
      };
    }

    // Client errors
    if (status >= 400 && status < 500) {
      return {
        category: 'CLIENT_ERROR',
        code: 'CLIENT_ERROR',
        retryable: false,
      };
    }

    // Malformed response
    if (errorMsg.includes('JSON') || errorMsg.includes('parse')) {
      return {
        category: 'MALFORMED_RESPONSE_ERROR',
        code: 'MALFORMED_RESPONSE_ERROR',
        retryable: true,
      };
    }

    return {
      category: 'UNKNOWN_ERROR',
      code: 'UNKNOWN_ERROR',
      retryable: false,
    };
  }

  getSafeErrorMessage(category) {
    const messages = {
      NETWORK_ERROR: 'Network connection failed. Please check your connection and try again.',
      TIMEOUT_ERROR: 'Request timed out. The API took too long to respond. Please try again.',
      RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
      MODEL_NOT_FOUND: 'The specified model is not available.',
      AUTH_ERROR: 'Authentication failed. Please check your configuration.',
      BAD_REQUEST_ERROR: 'Invalid request format. Please check your input parameters.',
      SERVER_ERROR: 'Service temporarily unavailable. Please try again later.',
      CLIENT_ERROR: 'Request error. Please check your input and try again.',
      MALFORMED_RESPONSE_ERROR: 'Invalid response from API. Please try again.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    };

    return messages[category] || messages.UNKNOWN_ERROR;
  }

  getErrorMessage(error) {
    if (!error) {
      return 'An unknown error occurred';
    }

    const categorized = this.categorizeError(error);
    return this.getSafeErrorMessage(categorized.category);
  }

  logError(error) {
    if (!error) {
      logger.warn('Attempted to log null/undefined error');
      return null;
    }

    const categorized = this.categorizeError(error);

    const logEntry = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: categorized.category,
      code: categorized.code,
      message: error.message || 'Unknown error',
      status: error.status || null,
      retryable: categorized.retryable,
      timestamp: new Date().toISOString(),
    };

    this.errorLog.push(logEntry);

    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog = this.errorLog.slice(-this.maxLogEntries);
    }

    logger.error(`Error logged [${categorized.category}]: ${error.message}`);

    return logEntry;
  }

  getErrorLog(limit = 100) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 100;
    }

    return {
      log: this.errorLog.slice(-limit),
      count: this.errorLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearErrorLog() {
    const clearedCount = this.errorLog.length;
    this.errorLog = [];
    logger.info(`Error log cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiErrorHandlingService = new AIErrorHandlingService();

export default aiErrorHandlingService;
export { AIErrorHandlingService };