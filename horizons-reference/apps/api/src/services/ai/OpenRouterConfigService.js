import 'dotenv/config';
import logger from '../../utils/logger.js';

class OpenRouterConfigService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.timeout = parseInt(process.env.OPENROUTER_TIMEOUT || '30000', 10);
    this.retryCount = parseInt(process.env.OPENROUTER_RETRY_COUNT || '3', 10);
    this.retryDelay = parseInt(process.env.OPENROUTER_RETRY_DELAY || '1000', 10);
    this.initialized = false;
    this.connectionStatus = 'not-initialized';
    logger.info('OpenRouterConfigService initialized');
  }

  initializeOpenRouter(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required and must be a string');
    }

    if (apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }

    if (apiKey.length < 10) {
      throw new Error('API key appears to be invalid (too short)');
    }

    this.apiKey = apiKey;
    this.initialized = true;
    this.connectionStatus = 'initialized';

    logger.info('OpenRouter initialized successfully');

    return {
      success: true,
      message: 'OpenRouter initialized successfully',
      timestamp: new Date().toISOString(),
    };
  }

  getOpenRouterConfig() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryCount: this.retryCount,
      retryDelay: this.retryDelay,
      initialized: this.initialized,
      connectionStatus: this.connectionStatus,
      timestamp: new Date().toISOString(),
    };
  }

  async validateOpenRouterConnection() {
    if (!this.initialized || !this.apiKey) {
      return {
        valid: false,
        error: 'OpenRouter not initialized',
        code: 'NOT_INITIALIZED',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
      });

      if (!response.ok) {
        logger.error(`OpenRouter connection validation failed: ${response.status}`);
        this.connectionStatus = 'failed';
        return {
          valid: false,
          error: `OpenRouter API returned ${response.status}`,
          code: 'CONNECTION_FAILED',
          status: response.status,
          timestamp: new Date().toISOString(),
        };
      }

      this.connectionStatus = 'connected';
      logger.info('OpenRouter connection validated successfully');

      return {
        valid: true,
        message: 'OpenRouter connection is valid',
        code: 'CONNECTION_VALID',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`OpenRouter connection validation error: ${error.message}`);
      this.connectionStatus = 'error';
      return {
        valid: false,
        error: 'Connection validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
      };
    }
  }

  getOpenRouterStatus() {
    return {
      initialized: this.initialized,
      connectionStatus: this.connectionStatus,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryCount: this.retryCount,
      retryDelay: this.retryDelay,
      apiKeyConfigured: this.apiKey.length > 0,
      apiKeyLength: this.apiKey.length,
      apiKeyPrefix: this.apiKey.length > 0 ? this.apiKey.substring(0, 4) + '****' : 'not-set',
      timestamp: new Date().toISOString(),
    };
  }

  isInitialized() {
    return this.initialized && this.apiKey.length > 0;
  }

  getApiKey() {
    if (!this.initialized) {
      throw new Error('OpenRouter not initialized');
    }
    return this.apiKey;
  }

  getHeaders() {
    if (!this.initialized) {
      throw new Error('OpenRouter not initialized');
    }

    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AI Orchestrator',
    };
  }
}

const openRouterConfigService = new OpenRouterConfigService();

export default openRouterConfigService;
export { OpenRouterConfigService };