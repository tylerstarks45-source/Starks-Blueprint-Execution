import logger from '../../utils/logger.js';
import aiRequestPipeline from '../../services/requests/AIRequestPipeline.js';

class AIRequestController {
  async handleAIRequest(req, res) {
    try {
      logger.info('AIRequestController: Processing AI request');

      const { prompt, model, temperature, maxTokens, systemPrompt } = req.body;

      // Extract userId from authenticated request
      const userId = req.auth?.id || req.user?.id || req.userId;

      if (!userId) {
        logger.warn('AIRequestController: Missing userId in authenticated request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'MISSING_USER_ID',
        });
      }

      // Validate required fields
      if (!prompt) {
        logger.warn('AIRequestController: Missing prompt in request body');
        return res.status(400).json({
          success: false,
          error: 'Prompt is required',
          code: 'MISSING_PROMPT',
        });
      }

      if (!model) {
        logger.warn('AIRequestController: Missing model in request body');
        return res.status(400).json({
          success: false,
          error: 'Model is required',
          code: 'MISSING_MODEL',
        });
      }

      // Process request through pipeline
      logger.debug(`AIRequestController: Sending request to pipeline - userId=${userId}, model=${model}`);

      const result = await aiRequestPipeline.processRequest({
        prompt,
        model,
        temperature,
        maxTokens,
        systemPrompt,
        userId,
      });

      if (!result.success) {
        logger.error(`AIRequestController: Pipeline returned error - ${result.error}`);
        
        const statusCode = result.details?.statusCode || 500;
        
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          details: result.details,
        });
      }

      logger.info(`AIRequestController: Request processed successfully - userId=${userId}`);

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error(`AIRequestController: Unexpected error - ${error.message}`);
      logger.error(error.stack);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  }

  async getRequestHistory(req, res) {
    try {
      logger.info('AIRequestController: Fetching request history');

      const userId = req.auth?.id || req.user?.id || req.userId;

      if (!userId) {
        logger.warn('AIRequestController: Missing userId for history request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'MISSING_USER_ID',
        });
      }

      const limit = parseInt(req.query.limit) || 50;

      if (limit < 1 || limit > 1000) {
        logger.warn(`AIRequestController: Invalid limit parameter - ${limit}`);
        return res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 1000',
          code: 'INVALID_LIMIT',
        });
      }

      const history = aiRequestPipeline.getRequestHistory(userId, limit);

      logger.info(`AIRequestController: Retrieved ${history.length} history entries for userId=${userId}`);

      return res.status(200).json({
        success: true,
        data: {
          history,
          count: history.length,
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(`AIRequestController: Error fetching history - ${error.message}`);
      logger.error(error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch request history',
        message: error.message,
        code: 'HISTORY_ERROR',
      });
    }
  }

  async getRequestStats(req, res) {
    try {
      logger.info('AIRequestController: Fetching request stats');

      const userId = req.auth?.id || req.user?.id || req.userId;

      if (!userId) {
        logger.warn('AIRequestController: Missing userId for stats request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'MISSING_USER_ID',
        });
      }

      const stats = aiRequestPipeline.getRequestStats(userId);

      if (!stats) {
        logger.warn(`AIRequestController: No stats found for userId=${userId}`);
        return res.status(404).json({
          success: false,
          error: 'No stats found for user',
          code: 'STATS_NOT_FOUND',
        });
      }

      logger.info(`AIRequestController: Retrieved stats for userId=${userId}`);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error(`AIRequestController: Error fetching stats - ${error.message}`);
      logger.error(error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch request stats',
        message: error.message,
        code: 'STATS_ERROR',
      });
    }
  }
}

const aiRequestController = new AIRequestController();

export default aiRequestController;
export { AIRequestController };