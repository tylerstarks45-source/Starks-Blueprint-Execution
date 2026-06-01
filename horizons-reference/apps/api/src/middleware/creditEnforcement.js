import logger from '../utils/logger.js';
import creditManager from '../services/credits/CreditManager.js';
import creditCalculator from '../services/credits/CreditCalculator.js';

export const creditEnforcement = async (req, res, next) => {
  try {
    const userId = req.auth?.id || req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required for credit check' });
    }

    // Estimate cost based on request body (rough estimation if tokens aren't provided)
    const promptTokens = req.body.prompt ? Math.ceil(req.body.prompt.length / 4) : 100;
    const completionTokens = req.body.maxTokens || 1000;
    
    const { estimatedCost } = creditCalculator.estimateCost(promptTokens, completionTokens);
    
    const hasCredits = await creditManager.checkCreditAvailability(userId, estimatedCost);
    
    if (!hasCredits) {
      logger.warn(`Credit enforcement failed for user ${userId}. Required: $${estimatedCost}`);
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        details: { estimatedCost }
      });
    }
    
    // Attach estimated cost to request for later deduction
    req.estimatedCost = estimatedCost;
    next();
  } catch (error) {
    logger.error(`Credit enforcement error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Error checking credits' });
  }
};