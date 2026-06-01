import 'dotenv/config';
import logger from '../utils/logger.js';

class OpenRouterConfig {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.timeout = parseInt(process.env.OPENROUTER_TIMEOUT || '30000', 10);
    this.retryCount = parseInt(process.env.OPENROUTER_RETRY_COUNT || '3', 10);
    this.retryDelay = parseInt(process.env.OPENROUTER_RETRY_DELAY || '1000', 10);
    this.validateOnInit();
  }

  validateOnInit() {
    if (!this.apiKey) {
      logger.warn('OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.');
      return;
    }

    const validation = this.validateApiKey(this.apiKey);
    if (!validation.valid) {
      logger.error(`Invalid OpenRouter API key format: ${validation.error}`);
      throw new Error(`OpenRouter configuration error: ${validation.error}`);
    }

    logger.info('OpenRouter configuration validated successfully');
  }

  validateApiKey(key) {
    if (!key) {
      return {
        valid: false,
        error: 'API key is required',
      };
    }

    if (typeof key !== 'string') {
      return {
        valid: false,
        error: 'API key must be a string',
      };
    }

    if (key.trim().length === 0) {
      return {
        valid: false,
        error: 'API key cannot be empty',
      };
    }

    if (key.length < 10) {
      return {
        valid: false,
        error: 'API key appears to be invalid (too short)',
      };
    }

    return {
      valid: true,
      message: 'API key format is valid',
    };
  }

  isConfigured() {
    return this.apiKey && this.apiKey.trim().length > 0;
  }

  getApiKeyStatus() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'OpenRouter API key not configured',
      };
    }

    const validation = this.validateApiKey(this.apiKey);
    return {
      configured: true,
      valid: validation.valid,
      message: validation.message || validation.error,
      keyLength: this.apiKey.length,
      keyPrefix: this.apiKey.substring(0, 4) + '****',
    };
  }

  getConfig() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryCount: this.retryCount,
      retryDelay: this.retryDelay,
      configured: this.isConfigured(),
    };
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AI Orchestrator',
    };
  }
}

const config = new OpenRouterConfig();

export default config;
export { OpenRouterConfig };