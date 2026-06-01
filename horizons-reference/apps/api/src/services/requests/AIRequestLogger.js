import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIRequestLogger {
  constructor() {
    this.requestHistory = [];
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.initialized = true;
    logger.info('AIRequestLogger initialized');
  }

  logRequestStart(userId, prompt, model, temperature, maxTokens) {
    if (!userId || !prompt || !model) {
      logger.warn('Invalid request start log parameters');
      return null;
    }

    const logEntry = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      promptLength: prompt.length,
      model,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2048,
      startTime: Date.now(),
      timestamp: new Date().toISOString(),
      status: 'started',
    };

    logger.info(`AI request started: userId=${userId}, model=${model}, promptLength=${prompt.length}`);
    return logEntry;
  }

  logRequestCompletion(requestId, userId, model, duration, tokens, provider) {
    if (!requestId || !userId || !model || typeof duration !== 'number' || !tokens) {
      logger.warn('Invalid request completion log parameters');
      return null;
    }

    const logEntry = {
      id: requestId,
      userId,
      model,
      provider: provider || 'unknown',
      duration,
      tokens: {
        input: tokens.input || 0,
        output: tokens.output || 0,
        total: tokens.total || 0,
      },
      completionTime: Date.now(),
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    this.requestHistory.push(logEntry);

    // Maintain history size
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    logger.info(`AI request completed: userId=${userId}, model=${model}, duration=${duration}ms, tokens=${tokens.total}`);
    return logEntry;
  }

  logError(userId, model, errorType, errorMessage) {
    if (!userId || !model || !errorType || !errorMessage) {
      logger.warn('Invalid error log parameters');
      return null;
    }

    const logEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      model,
      errorType,
      errorMessage,
      timestamp: new Date().toISOString(),
      status: 'error',
    };

    this.errorHistory.push(logEntry);

    // Maintain history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    logger.error(`AI request error: userId=${userId}, model=${model}, errorType=${errorType}, message=${errorMessage}`);
    return logEntry;
  }

  getRequestHistory(userId, limit = 50) {
    if (!userId || typeof userId !== 'string') {
      logger.warn('Invalid user ID for request history');
      return [];
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    const userHistory = this.requestHistory.filter(entry => entry.userId === userId);
    return userHistory.slice(-limit);
  }

  getErrorHistory(userId, limit = 50) {
    if (!userId || typeof userId !== 'string') {
      logger.warn('Invalid user ID for error history');
      return [];
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    const userErrors = this.errorHistory.filter(entry => entry.userId === userId);
    return userErrors.slice(-limit);
  }

  getRequestStats(userId) {
    if (!userId || typeof userId !== 'string') {
      logger.warn('Invalid user ID for request stats');
      return null;
    }

    const userHistory = this.requestHistory.filter(entry => entry.userId === userId && entry.status === 'completed');

    if (userHistory.length === 0) {
      return {
        userId,
        totalRequests: 0,
        totalTokens: 0,
        averageTokens: 0,
        averageDuration: 0,
        modelBreakdown: {},
        timestamp: new Date().toISOString(),
      };
    }

    const totalTokens = userHistory.reduce((sum, entry) => sum + (entry.tokens?.total || 0), 0);
    const totalDuration = userHistory.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const averageTokens = Math.round(totalTokens / userHistory.length);
    const averageDuration = Math.round(totalDuration / userHistory.length);

    // Model breakdown
    const modelBreakdown = {};
    userHistory.forEach(entry => {
      if (!modelBreakdown[entry.model]) {
        modelBreakdown[entry.model] = {
          count: 0,
          totalTokens: 0,
          averageTokens: 0,
        };
      }
      modelBreakdown[entry.model].count += 1;
      modelBreakdown[entry.model].totalTokens += entry.tokens?.total || 0;
    });

    // Calculate average tokens per model
    Object.keys(modelBreakdown).forEach(model => {
      modelBreakdown[model].averageTokens = Math.round(
        modelBreakdown[model].totalTokens / modelBreakdown[model].count
      );
    });

    return {
      userId,
      totalRequests: userHistory.length,
      totalTokens,
      averageTokens,
      averageDuration,
      modelBreakdown,
      timestamp: new Date().toISOString(),
    };
  }

  getAllHistory(limit = 100) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 100;
    }

    return {
      requests: this.requestHistory.slice(-limit),
      errors: this.errorHistory.slice(-limit),
      totalRequests: this.requestHistory.length,
      totalErrors: this.errorHistory.length,
      timestamp: new Date().toISOString(),
    };
  }

  clearHistory() {
    const clearedRequests = this.requestHistory.length;
    const clearedErrors = this.errorHistory.length;

    this.requestHistory = [];
    this.errorHistory = [];

    logger.info(`History cleared: ${clearedRequests} requests, ${clearedErrors} errors`);

    return {
      success: true,
      clearedRequests,
      clearedErrors,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiRequestLogger = new AIRequestLogger();

export default aiRequestLogger;
export { AIRequestLogger };