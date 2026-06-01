import logger from '../../utils/logger.js';
import creditManager from '../../services/credits/CreditManager.js';
import creditCalculator from '../../services/credits/CreditCalculator.js';

class CreditController {
  async getBalance(req, res) {
    try {
      const userId = req.auth?.id || req.user?.id || req.userId;
      const credits = await creditManager.getUserCredits(userId);
      return res.status(200).json({ success: true, data: credits });
    } catch (error) {
      logger.error(`Error getting balance: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getHistory(req, res) {
    try {
      const userId = req.auth?.id || req.user?.id || req.userId;
      const history = await creditManager.getCreditHistory(userId);
      return res.status(200).json(history);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStats(req, res) {
    try {
      const userId = req.auth?.id || req.user?.id || req.userId;
      const stats = await creditManager.getCreditStats(userId);
      return res.status(200).json(stats);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async estimateCost(req, res) {
    try {
      const { promptTokens, completionTokens } = req.body;
      const estimate = creditCalculator.estimateCost(promptTokens, completionTokens);
      return res.status(200).json({ success: true, data: estimate });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getModels(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        costPerToken: creditCalculator.costPerToken
      }
    });
  }
}

export default new CreditController();