import 'dotenv/config';
import logger from '../../utils/logger.js';

class AITokenTrackingService {
  constructor() {
    this.userTokenUsage = new Map();
    this.modelTokenUsage = new Map();
    this.tokenLog = [];
    this.maxLogEntries = 10000;
    this.initialized = true;
    logger.info('AITokenTrackingService initialized');
  }

  trackTokenUsage(userId, model, inputTokens, outputTokens, cost) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    if (typeof inputTokens !== 'number' || inputTokens < 0) {
      throw new Error('Input tokens must be a non-negative number');
    }

    if (typeof outputTokens !== 'number' || outputTokens < 0) {
      throw new Error('Output tokens must be a non-negative number');
    }

    if (typeof cost !== 'number' || cost < 0) {
      throw new Error('Cost must be a non-negative number');
    }

    const totalTokens = inputTokens + outputTokens;

    // Track user usage
    if (!this.userTokenUsage.has(userId)) {
      this.userTokenUsage.set(userId, {
        userId,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        byModel: {},
        firstUsedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      });
    }

    const userUsage = this.userTokenUsage.get(userId);
    userUsage.totalTokens += totalTokens;
    userUsage.totalCost += cost;
    userUsage.requestCount += 1;
    userUsage.lastUsedAt = new Date().toISOString();

    if (!userUsage.byModel[model]) {
      userUsage.byModel[model] = {
        tokens: 0,
        cost: 0,
        requests: 0,
      };
    }

    userUsage.byModel[model].tokens += totalTokens;
    userUsage.byModel[model].cost += cost;
    userUsage.byModel[model].requests += 1;

    // Track model usage
    if (!this.modelTokenUsage.has(model)) {
      this.modelTokenUsage.set(model, {
        model,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        userCount: 0,
        users: new Set(),
      });
    }

    const modelUsage = this.modelTokenUsage.get(model);
    modelUsage.totalTokens += totalTokens;
    modelUsage.totalCost += cost;
    modelUsage.requestCount += 1;
    modelUsage.users.add(userId);
    modelUsage.userCount = modelUsage.users.size;

    // Log usage
    const logEntry = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      timestamp: new Date().toISOString(),
    };

    this.tokenLog.push(logEntry);

    // Maintain log size
    if (this.tokenLog.length > this.maxLogEntries) {
      this.tokenLog = this.tokenLog.slice(-this.maxLogEntries);
    }

    logger.info(`Token usage tracked: ${userId} - ${model} (${totalTokens} tokens, $${cost.toFixed(6)})`);

    return logEntry;
  }

  getTokenUsageByUser(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const usage = this.userTokenUsage.get(userId);

    if (!usage) {
      return {
        userId,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        byModel: {},
        message: 'No usage data available',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      userId,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      requestCount: usage.requestCount,
      byModel: usage.byModel,
      firstUsedAt: usage.firstUsedAt,
      lastUsedAt: usage.lastUsedAt,
      timestamp: new Date().toISOString(),
    };
  }

  getTokenUsageByModel(model) {
    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    const usage = this.modelTokenUsage.get(model);

    if (!usage) {
      return {
        model,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        userCount: 0,
        message: 'No usage data available',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      model,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      requestCount: usage.requestCount,
      userCount: usage.userCount,
      timestamp: new Date().toISOString(),
    };
  }

  getTokenUsageByDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();

    if (isNaN(startTime) || isNaN(endTime)) {
      throw new Error('Invalid date format');
    }

    const filtered = this.tokenLog.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= startTime && entryTime <= endTime;
    });

    const totalTokens = filtered.reduce((sum, entry) => sum + entry.totalTokens, 0);
    const totalCost = filtered.reduce((sum, entry) => sum + entry.cost, 0);

    return {
      startDate,
      endDate,
      entries: filtered,
      count: filtered.length,
      totalTokens,
      totalCost,
      timestamp: new Date().toISOString(),
    };
  }

  getTotalTokensCost(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const usage = this.userTokenUsage.get(userId);

    if (!usage) {
      return {
        userId,
        totalTokens: 0,
        totalCost: 0,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      userId,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      timestamp: new Date().toISOString(),
    };
  }

  getTokenUsageStats() {
    const totalTokens = Array.from(this.userTokenUsage.values()).reduce(
      (sum, usage) => sum + usage.totalTokens,
      0
    );

    const totalCost = Array.from(this.userTokenUsage.values()).reduce(
      (sum, usage) => sum + usage.totalCost,
      0
    );

    const totalRequests = Array.from(this.userTokenUsage.values()).reduce(
      (sum, usage) => sum + usage.requestCount,
      0
    );

    return {
      totalTokens,
      totalCost,
      totalRequests,
      totalUsers: this.userTokenUsage.size,
      totalModels: this.modelTokenUsage.size,
      logEntries: this.tokenLog.length,
      timestamp: new Date().toISOString(),
    };
  }

  logTokenUsage(logEntry) {
    if (!logEntry || typeof logEntry !== 'object') {
      throw new Error('Log entry must be a valid object');
    }

    const entry = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...logEntry,
      timestamp: new Date().toISOString(),
    };

    this.tokenLog.push(entry);

    if (this.tokenLog.length > this.maxLogEntries) {
      this.tokenLog = this.tokenLog.slice(-this.maxLogEntries);
    }

    logger.info(`Token usage logged: ${entry.userId} - ${entry.model}`);

    return entry;
  }

  getTokenLog(limit = 100) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 100;
    }

    return {
      log: this.tokenLog.slice(-limit),
      count: this.tokenLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearTokenLog() {
    const clearedCount = this.tokenLog.length;
    this.tokenLog = [];
    logger.info(`Token log cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiTokenTrackingService = new AITokenTrackingService();

export default aiTokenTrackingService;
export { AITokenTrackingService };