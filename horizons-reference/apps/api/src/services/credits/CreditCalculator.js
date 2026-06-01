import 'dotenv/config';

class CreditCalculator {
  constructor() {
    this.costPerToken = parseFloat(process.env.COST_PER_TOKEN || '0.001');
  }

  calculateRequestCost(promptTokens, completionTokens) {
    const totalTokens = (promptTokens || 0) + (completionTokens || 0);
    const cost = totalTokens * this.costPerToken;
    return { cost, totalTokens, costPerToken: this.costPerToken };
  }

  estimateCost(promptTokens, completionTokens) {
    const totalTokens = (promptTokens || 0) + (completionTokens || 0);
    const estimatedCost = totalTokens * this.costPerToken;
    return { estimatedCost, totalTokens, costPerToken: this.costPerToken };
  }

  async calculateMonthlyCost(userId) {
    // In a real implementation, this would query the token_usage collection for the current month
    return { cost: 0, costPerToken: this.costPerToken };
  }
}

export default new CreditCalculator();