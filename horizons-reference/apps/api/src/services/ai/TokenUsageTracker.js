import 'dotenv/config';
import logger from '../../utils/logger.js';

class TokenUsageTracker {
  constructor() {
    this.usageData = new Map(); // userId -> array of usage records
    this.modelPricing = this.initializeModelPricing();
    this.initialized = true;
    logger.info('TokenUsageTracker initialized');
  }

  initializeModelPricing() {
    return {
      'claude-3-5-sonnet': {
        inputCostPerToken: 0.000003,
        outputCostPerToken: 0.000015,
      },
      'claude-3-opus': {
        inputCostPerToken: 0.000015,
        outputCostPerToken: 0.000075,
      },
      'gpt-4': {
        inputCostPerToken: 0.00003,
        outputCostPerToken: 0.00006,
      },
      'gpt-4-turbo': {
        inputCostPerToken: 0.00001,
        outputCostPerToken: 0.00003,
      },
      'gemini-2-flash': {
        inputCostPerToken: 0.0000075,
        outputCostPerToken: 0.00003,
      },
      'deepseek-chat': {
        inputCostPerToken: 0.0000055,
        outputCostPerToken: 0.0000275,
      },
    };
  }

  trackUsage(userId, model, inputTokens, outputTokens, timestamp = new Date().toISOString()) {
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

    // Calculate cost
    const costEstimate = this.calculateCost(model, inputTokens, outputTokens);

    // Create usage record
    const usageRecord = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      cost_estimate: costEstimate,
      timestamp,
    };

    // Store usage data
    if (!this.usageData.has(userId)) {
      this.usageData.set(userId, []);
    }

    const userUsage = this.usageData.get(userId);
    userUsage.push(usageRecord);

    // Keep only last 1000 records per user
    if (userUsage.length > 1000) {
      this.usageData.set(userId, userUsage.slice(-1000));
    }

    logger.info(`Token usage tracked: ${userId} - ${model} (${inputTokens} input, ${outputTokens} output, $${costEstimate.toFixed(6)} cost)`);

    return usageRecord;
  }

  calculateCost(model, inputTokens, outputTokens) {
    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    if (typeof inputTokens !== 'number' || inputTokens < 0) {
      throw new Error('Input tokens must be a non-negative number');
    }

    if (typeof outputTokens !== 'number' || outputTokens < 0) {
      throw new Error('Output tokens must be a non-negative number');
    }

    const pricing = this.modelPricing[model];
    if (!pricing) {
      logger.warn(`No pricing found for model: ${model}, using default pricing`);
      return (inputTokens + outputTokens) * 0.00001; // Default fallback
    }

    const inputCost = inputTokens * pricing.inputCostPerToken;
    const outputCost = outputTokens * pricing.outputCostPerToken;
    const totalCost = inputCost + outputCost;

    return parseFloat(totalCost.toFixed(6));
  }

  getUsageStats(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const userUsage = this.usageData.get(userId) || [];

    if (userUsage.length === 0) {
      return {
        userId,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        byModel: {},
        timestamp: new Date().toISOString(),
      };
    }

    let totalTokens = 0;
    let totalCost = 0;
    const byModel = {};

    userUsage.forEach(record => {
      totalTokens += record.total_tokens;
      totalCost += record.cost_estimate;

      if (!byModel[record.model]) {
        byModel[record.model] = {
          tokens: 0,
          cost: 0,
          requests: 0,
        };
      }

      byModel[record.model].tokens += record.total_tokens;
      byModel[record.model].cost += record.cost_estimate;
      byModel[record.model].requests += 1;
    });

    return {
      userId,
      totalTokens,
      totalCost: parseFloat(totalCost.toFixed(6)),
      requestCount: userUsage.length,
      byModel,
      timestamp: new Date().toISOString(),
    };
  }

  getUserUsageHistory(userId, limit = 50) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    const userUsage = this.usageData.get(userId) || [];
    return {
      userId,
      history: userUsage.slice(-limit),
      count: userUsage.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearUserUsage(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const hadData = this.usageData.has(userId);
    this.usageData.delete(userId);

    logger.info(`User usage data cleared: ${userId}`);

    return {
      success: true,
      userId,
      hadData,
      timestamp: new Date().toISOString(),
    };
  }
}

const tokenUsageTracker = new TokenUsageTracker();

export default tokenUsageTracker;
export { TokenUsageTracker };