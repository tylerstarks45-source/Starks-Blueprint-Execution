import logger from '../../utils/logger.js';
import creditCalculator from './CreditCalculator.js';

class TokenTracker {
  async trackTokens(userId, model, promptTokens, completionTokens) {
    try {
      const { cost, totalTokens } = creditCalculator.calculateRequestCost(promptTokens, completionTokens);
      
      const record = {
        userId,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        timestamp: new Date().toISOString()
      };

      logger.info(`Tracked tokens for user ${userId}: ${totalTokens} tokens, cost: $${cost}`);
      
      return {
        success: true,
        tokens: totalTokens,
        cost,
        model,
        timestamp: record.timestamp
      };
    } catch (error) {
      logger.error(`Error tracking tokens: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getUserTokenStats(userId) {
    return {
      totalTokens: 0,
      averagePerRequest: 0,
      peakUsage: 0
    };
  }

  async getModelTokenStats(model) {
    return {
      tokens: 0,
      cost: 0,
      model
    };
  }
}

export default new TokenTracker();