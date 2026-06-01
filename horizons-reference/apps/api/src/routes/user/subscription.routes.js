import express from 'express';
import { requireAuth } from '../../middleware/adminAuth.js';
import userSubscriptionService from '../../services/subscription/UserSubscriptionService.js';
import userCreditService from '../../services/subscription/UserCreditService.js';
import userLimitsService from '../../services/subscription/UserLimitsService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /my-subscription - Returns user's subscription tier, status, features, limits
router.get('/my-subscription', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;
    const subscription = userSubscriptionService.getSubscriptionStatus(userId);

    const response = {
      status: 'success',
      data: {
        userId: subscription.userId,
        subscription: subscription.status,
        limits: subscription.limits,
        features: subscription.features,
        support: subscription.support,
        monthlyPrice: subscription.monthlyPrice,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User subscription retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User subscription retrieval error:', error.message);
    throw error;
  }
});

// GET /subscription-limits - Returns user's current limits and usage percentage
router.get('/subscription-limits', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;
    const allStatuses = userLimitsService.getAllResourceLimitStatuses(userId);

    const response = {
      status: 'success',
      data: {
        userId: allStatuses.userId,
        resources: allStatuses.resources,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User subscription limits retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User subscription limits retrieval error:', error.message);
    throw error;
  }
});

// GET /available-features - Returns features available in user's tier
router.get('/available-features', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;
    const subscription = userSubscriptionService.getUserSubscriptionTier(userId);
    const features = userSubscriptionService.getAvailableFeatures(subscription.subscription.tier);

    const response = {
      status: 'success',
      data: {
        userId,
        tier: subscription.subscription.tier,
        tierName: subscription.subscription.tierName,
        features: features.features,
        featureCount: features.featureCount,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User available features retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User available features retrieval error:', error.message);
    throw error;
  }
});

// GET /credit-balance - Returns user's credit balance, monthly allocation, burn rate
router.get('/credit-balance', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;
    const credits = userCreditService.getUserCreditBalance(userId);

    const response = {
      status: 'success',
      data: {
        userId: credits.userId,
        balance: credits.balance,
        monthlyAllocation: credits.monthlyAllocation,
        tier: credits.tier,
        burnRate: credits.burnRate,
        lastResetDate: credits.lastResetDate,
        nextResetDate: credits.nextResetDate,
        daysUntilReset: credits.daysUntilReset,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User credit balance retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User credit balance retrieval error:', error.message);
    throw error;
  }
});

// GET /credit-history - Returns user's credit transaction history
router.get('/credit-history', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50 } = req.query;
    const history = userCreditService.getCreditHistory(userId, parseInt(limit, 10));

    const response = {
      status: 'success',
      data: {
        userId: history.userId,
        transactions: history.transactions,
        count: history.count,
        limit: history.limit,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User credit history retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User credit history retrieval error:', error.message);
    throw error;
  }
});

// GET /resource-usage - Returns user's resource usage and limits for all resource types
router.get('/resource-usage', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;
    const usage = userLimitsService.getUserResourceUsage(userId);
    const allStatuses = userLimitsService.getAllResourceLimitStatuses(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        currentUsage: usage,
        limitStatuses: allStatuses.resources,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User resource usage retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User resource usage retrieval error:', error.message);
    throw error;
  }
});

export default router;