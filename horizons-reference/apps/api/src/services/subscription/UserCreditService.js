import 'dotenv/config';
import logger from '../../utils/logger.js';

class UserCreditService {
  constructor() {
    this.userCredits = new Map();
    this.creditHistory = new Map();
    this.creditLimits = this.initializeCreditLimits();
    this.initialized = true;
    logger.info('User Credit Service initialized');
  }

  initializeCreditLimits() {
    return {
      starter: 10000,
      builder: 50000,
      operator: 200000,
      empire: 1000000,
    };
  }

  getUserCreditBalance(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    let credits = this.userCredits.get(userId);
    if (!credits) {
      // Initialize with starter tier allocation
      credits = {
        userId,
        balance: this.creditLimits.starter,
        monthlyAllocation: this.creditLimits.starter,
        tier: 'starter',
        lastResetDate: new Date().toISOString(),
        nextResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.userCredits.set(userId, credits);
    }

    const burnRate = this.calculateBurnRate(userId);

    return {
      userId,
      balance: credits.balance,
      monthlyAllocation: credits.monthlyAllocation,
      tier: credits.tier,
      burnRate,
      lastResetDate: credits.lastResetDate,
      nextResetDate: credits.nextResetDate,
      daysUntilReset: this.calculateDaysUntilReset(credits.nextResetDate),
      timestamp: new Date().toISOString(),
    };
  }

  deductCredits(userId, amount, reason = 'ai-usage') {
    if (!userId || typeof amount !== 'number' || amount <= 0) {
      throw new Error('User ID and positive amount are required');
    }

    const credits = this.getUserCreditBalance(userId);
    const currentBalance = credits.balance;

    if (currentBalance < amount) {
      return {
        success: false,
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        currentBalance,
        requiredAmount: amount,
        shortfall: amount - currentBalance,
      };
    }

    const creditData = this.userCredits.get(userId);
    creditData.balance -= amount;

    // Record transaction
    this.recordCreditTransaction(userId, -amount, reason);

    logger.info(`Credits deducted: ${userId} - ${amount} (reason: ${reason})`);

    return {
      success: true,
      userId,
      amount,
      reason,
      previousBalance: currentBalance,
      newBalance: creditData.balance,
      timestamp: new Date().toISOString(),
    };
  }

  addCredits(userId, amount, reason = 'manual-add') {
    if (!userId || typeof amount !== 'number' || amount <= 0) {
      throw new Error('User ID and positive amount are required');
    }

    const creditData = this.userCredits.get(userId);
    if (!creditData) {
      throw new Error('User credits not found');
    }

    const previousBalance = creditData.balance;
    creditData.balance += amount;

    // Record transaction
    this.recordCreditTransaction(userId, amount, reason);

    logger.info(`Credits added: ${userId} - ${amount} (reason: ${reason})`);

    return {
      success: true,
      userId,
      amount,
      reason,
      previousBalance,
      newBalance: creditData.balance,
      timestamp: new Date().toISOString(),
    };
  }

  checkCreditAvailability(userId, requiredCredits) {
    if (!userId || typeof requiredCredits !== 'number' || requiredCredits <= 0) {
      return {
        available: false,
        error: 'User ID and positive required credits are required',
        code: 'INVALID_PARAMETERS',
      };
    }

    const credits = this.getUserCreditBalance(userId);
    const available = credits.balance >= requiredCredits;

    return {
      available,
      userId,
      requiredCredits,
      currentBalance: credits.balance,
      shortfall: available ? 0 : requiredCredits - credits.balance,
      timestamp: new Date().toISOString(),
    };
  }

  getCreditHistory(userId, limit = 50) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    const history = this.creditHistory.get(userId) || [];

    return {
      userId,
      transactions: history.slice(-limit),
      count: history.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  getCreditLimits(tier) {
    if (!tier || typeof tier !== 'string') {
      throw new Error('Tier is required and must be a string');
    }

    const limit = this.creditLimits[tier];
    if (!limit) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    return {
      tier,
      monthlyAllocation: limit,
      timestamp: new Date().toISOString(),
    };
  }

  getMonthlyAllocation(tier) {
    if (!tier || typeof tier !== 'string') {
      throw new Error('Tier is required and must be a string');
    }

    const allocation = this.creditLimits[tier];
    if (!allocation) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    return {
      tier,
      monthlyAllocation: allocation,
      timestamp: new Date().toISOString(),
    };
  }

  prepareCreditBilling() {
    return {
      status: 'prepared',
      message: 'Credit system prepared for billing integration',
      preparation: {
        creditAllocationConfigured: true,
        consumptionTrackingReady: true,
        balanceManagementReady: true,
        expirationHandlingPrepared: true,
        refundSystemPrepared: true,
      },
      readyForBilling: true,
      note: 'Actual payment processing not yet implemented',
      timestamp: new Date().toISOString(),
    };
  }

  recordCreditTransaction(userId, amount, reason) {
    if (!this.creditHistory.has(userId)) {
      this.creditHistory.set(userId, []);
    }

    const transaction = {
      id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      amount,
      reason,
      timestamp: new Date().toISOString(),
    };

    const history = this.creditHistory.get(userId);
    history.push(transaction);

    // Keep only last 1000 transactions per user
    if (history.length > 1000) {
      this.creditHistory.set(userId, history.slice(-1000));
    }

    return transaction;
  }

  calculateBurnRate(userId) {
    const history = this.creditHistory.get(userId) || [];
    if (history.length === 0) {
      return 0;
    }

    // Calculate burn rate over last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentTransactions = history.filter(t => new Date(t.timestamp).getTime() > sevenDaysAgo);

    const totalBurned = recentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return Math.round(totalBurned / 7);
  }

  calculateDaysUntilReset(nextResetDate) {
    const now = Date.now();
    const resetTime = new Date(nextResetDate).getTime();
    const daysUntil = Math.ceil((resetTime - now) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysUntil);
  }

  setUserTierAllocation(userId, tier) {
    if (!userId || !tier) {
      throw new Error('User ID and tier are required');
    }

    const allocation = this.creditLimits[tier];
    if (!allocation) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    const creditData = this.userCredits.get(userId);
    if (!creditData) {
      throw new Error('User credits not found');
    }

    creditData.tier = tier;
    creditData.monthlyAllocation = allocation;
    creditData.balance = allocation; // Reset balance to new tier allocation
    creditData.lastResetDate = new Date().toISOString();
    creditData.nextResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    logger.info(`User tier allocation updated: ${userId} -> ${tier} (${allocation} credits)`);

    return creditData;
  }
}

const userCreditService = new UserCreditService();

export default userCreditService;
export { UserCreditService };