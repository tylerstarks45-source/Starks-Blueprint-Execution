import 'dotenv/config';
import logger from '../../utils/logger.js';
import aiRequestService from '../../services/ai/AIRequestService.js';
import openRouterService from '../../services/ai/OpenRouterService.js';

class OpenRouterController {
  async sendRequest(req, res) {
    const { prompt, model, temperature, maxTokens, systemPrompt } = req.body;

    logger.info('AI request received');

    // Validate input
    const validation = aiRequestService.validateRequest(prompt, model, systemPrompt);

    if (!validation.valid) {
      logger.warn(`AI request validation failed: ${validation.error}`);
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Send request to OpenRouter
    const result = await openRouterService.sendPrompt(prompt, model, {
      temperature,
      maxTokens,
    });

    logger.info(`AI request completed successfully: model=${model}`);

    res.json({
      success: true,
      response: result.text,
      model: result.model,
      provider: result.provider,
      tokens: result.tokens,
      duration: result.duration,
      timestamp: result.timestamp,
    });
  }

  async getModels(req, res) {
    logger.info('Fetching available models');

    const models = aiRequestService.getSupportedModels();

    logger.info(`Available models retrieved: ${models.count} models`);

    res.json({
      success: true,
      models: models.models,
      count: models.count,
      timestamp: models.timestamp,
    });
  }

  async getHealth(req, res) {
    logger.info('Checking OpenRouter health');

    const validation = await openRouterService.validateApiKey();

    const status = validation.valid ? 'healthy' : 'unhealthy';

    logger.info(`OpenRouter health check: ${status}`);

    res.json({
      success: true,
      status,
      provider: 'openrouter',
      connected: validation.valid,
      message: validation.message,
      timestamp: validation.timestamp,
    });
  }
}

const openRouterController = new OpenRouterController();

export default openRouterController;
export { OpenRouterController };