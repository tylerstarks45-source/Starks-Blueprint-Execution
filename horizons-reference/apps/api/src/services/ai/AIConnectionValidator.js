import 'dotenv/config';
import axios from 'axios';
import logger from '../../utils/logger.js';

class AIConnectionValidator {
  constructor() {
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.timeout = 5000; // 5 second timeout for validation
    this.providers = ['Anthropic', 'OpenAI', 'Google', 'DeepSeek'];
    this.initialized = !!this.apiKey;
    logger.info('AIConnectionValidator initialized');
  }

  async testConnectivity() {
    logger.info('Testing OpenRouter connectivity');

    try {
      const startTime = Date.now();

      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        logger.info(`OpenRouter connectivity test successful (${duration}ms)`);
        return {
          connected: true,
          message: 'Successfully connected to OpenRouter API',
          duration,
          timestamp: new Date().toISOString(),
        };
      }

      logger.warn(`OpenRouter connectivity test returned unexpected status: ${response.status}`);
      return {
        connected: false,
        message: `Unexpected response status: ${response.status}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`OpenRouter connectivity test failed: ${error.message}`);
      return {
        connected: false,
        message: this.getHumanReadableErrorMessage(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async validateApiKey() {
    logger.info('Validating OpenRouter API key');

    if (!this.apiKey) {
      logger.warn('API key validation failed: no API key configured');
      return {
        valid: false,
        message: 'OpenRouter API key is not configured',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const startTime = Date.now();

      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        logger.info(`API key validation successful (${duration}ms)`);
        return {
          valid: true,
          message: 'API key is valid and OpenRouter is accessible',
          duration,
          timestamp: new Date().toISOString(),
        };
      }

      logger.warn(`API key validation returned unexpected status: ${response.status}`);
      return {
        valid: false,
        message: `Unexpected response status: ${response.status}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        logger.error('API key validation failed: Unauthorized (invalid key)');
        return {
          valid: false,
          message: 'API key is invalid or expired',
          timestamp: new Date().toISOString(),
        };
      }

      logger.error(`API key validation failed: ${error.message}`);
      return {
        valid: false,
        message: this.getHumanReadableErrorMessage(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkProviderAvailability(provider) {
    if (!provider || typeof provider !== 'string') {
      logger.warn('Provider availability check: invalid provider parameter');
      return {
        available: false,
        provider: provider || 'unknown',
        message: 'Provider parameter is required and must be a string',
        timestamp: new Date().toISOString(),
      };
    }

    logger.info(`Checking availability for provider: ${provider}`);

    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      if (response.status !== 200) {
        logger.warn(`Provider availability check returned status: ${response.status}`);
        return {
          available: false,
          provider,
          message: `Unexpected response status: ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      const models = response.data.data || [];
      const providerModels = models.filter(m => {
        const modelProvider = m.owned_by || '';
        return modelProvider.toLowerCase().includes(provider.toLowerCase());
      });

      const available = providerModels.length > 0;

      logger.info(`Provider ${provider} availability: ${available} (${providerModels.length} models)`);

      return {
        available,
        provider,
        modelCount: providerModels.length,
        message: available
          ? `${provider} is available with ${providerModels.length} models`
          : `${provider} is not currently available`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Provider availability check failed for ${provider}: ${error.message}`);
      return {
        available: false,
        provider,
        message: this.getHumanReadableErrorMessage(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AI Orchestrator',
    };
  }

  getHumanReadableErrorMessage(error) {
    const status = error.response?.status;
    const code = error.code;

    if (status === 401) {
      return 'Authentication failed: Invalid API key';
    }

    if (status === 429) {
      return 'Rate limit exceeded: Too many requests';
    }

    if (status === 503) {
      return 'Service unavailable: OpenRouter is temporarily down';
    }

    if (status >= 500) {
      return `Server error: OpenRouter returned status ${status}`;
    }

    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return 'Connection timeout: Request took too long';
    }

    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      return 'Connection failed: Cannot reach OpenRouter API';
    }

    if (code === 'ENETUNREACH') {
      return 'Network unreachable: Check your internet connection';
    }

    return `Connection error: ${error.message}`;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      providers: this.providers,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiConnectionValidator = new AIConnectionValidator();

export default aiConnectionValidator;
export { AIConnectionValidator };