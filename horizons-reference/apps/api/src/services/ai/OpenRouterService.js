import 'dotenv/config';
import axios from 'axios';
import logger from '../../utils/logger.js';

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.timeout = parseInt(process.env.OPENROUTER_TIMEOUT || '30000', 10);
    this.retryCount = parseInt(process.env.OPENROUTER_RETRY_COUNT || '3', 10);
    this.retryDelay = parseInt(process.env.OPENROUTER_RETRY_DELAY || '1000', 10);
    this.supportedModels = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4-turbo',
      'google/gemini-2.0-flash',
      'deepseek/deepseek-chat',
    ];
    this.requestHistory = [];
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.initialized = !!this.apiKey;

    if (!this.initialized) {
      logger.warn('OpenRouterService: API key not configured');
    } else {
      logger.info('OpenRouterService initialized successfully');
    }
  }

  async sendPrompt(prompt, model, options = {}) {
    if (!this.initialized) {
      throw new Error('OpenRouter API key not configured');
    }

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required and must be a string');
    }

    if (!model || typeof model !== 'string') {
      throw new Error('Model is required and must be a string');
    }

    // Validate model is supported
    if (!this.supportedModels.includes(model)) {
      throw new Error(`Model not supported: ${model}. Supported models: ${this.supportedModels.join(', ')}`);
    }

    const requestPayload = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      top_p: options.topP || 1,
    };

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    logger.info(`OpenRouter request initiated: ${requestId} (model: ${model})`);

    try {
      const response = await this.makeRequest(requestPayload, 0);
      const duration = Date.now() - startTime;

      // Extract token counts
      const tokens = {
        input: response.data.usage?.prompt_tokens || 0,
        output: response.data.usage?.completion_tokens || 0,
        total: response.data.usage?.total_tokens || 0,
      };

      // Extract response content
      const responseContent = response.data.choices?.[0]?.message?.content || '';

      const result = {
        text: responseContent,
        model,
        provider: 'openrouter',
        tokens,
        duration,
        timestamp: new Date().toISOString(),
      };

      // Log request history
      this.logRequest({
        requestId,
        model,
        prompt: prompt.substring(0, 100),
        status: 'success',
        duration,
        tokens,
      });

      logger.info(`OpenRouter request completed: ${requestId} (${duration}ms, ${tokens.total} tokens)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error history
      this.logError({
        requestId,
        model,
        status: 'error',
        duration,
        error: error.message,
        code: error.code,
      });

      logger.error(`OpenRouter request failed: ${requestId} - ${error.message}`);

      throw error;
    }
  }

  async makeRequest(payload, attemptNumber = 0) {
    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      return response;
    } catch (error) {
      const status = error.response?.status;
      const isRetryable = this.isRetryableError(status, error.code);

      if (isRetryable && attemptNumber < this.retryCount) {
        const delayMs = this.retryDelay * Math.pow(2, attemptNumber);
        logger.warn(`OpenRouter request failed (attempt ${attemptNumber + 1}/${this.retryCount}), retrying in ${delayMs}ms`);
        await this.delay(delayMs);
        return this.makeRequest(payload, attemptNumber + 1);
      }

      // Handle specific HTTP errors
      if (status === 401) {
        throw new Error('OpenRouter: Unauthorized - Invalid API key');
      }

      if (status === 429) {
        throw new Error('OpenRouter: Rate limit exceeded - Too many requests');
      }

      if (status === 503) {
        throw new Error('OpenRouter: Service unavailable - Provider is down');
      }

      if (status >= 500) {
        throw new Error(`OpenRouter: Server error (${status})`);
      }

      if (status >= 400) {
        throw new Error(`OpenRouter: Client error (${status}) - ${error.response?.data?.error?.message || 'Unknown error'}`);
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('OpenRouter: Request timeout - API took too long to respond');
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('OpenRouter: Connection failed - Cannot reach API');
      }

      throw new Error(`OpenRouter: ${error.message}`);
    }
  }

  async getAvailableModels() {
    if (!this.initialized) {
      throw new Error('OpenRouter API key not configured');
    }

    logger.info('Fetching available models from OpenRouter');

    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      const models = response.data.data || [];

      logger.info(`Retrieved ${models.length} available models from OpenRouter`);

      return {
        success: true,
        models: models.map(model => ({
          id: model.id,
          name: model.name || model.id,
          provider: model.owned_by || 'unknown',
          contextLength: model.context_length || 0,
          pricing: model.pricing || {},
        })),
        count: models.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to fetch models: ${error.message}`);
      throw error;
    }
  }

  async validateApiKey() {
    if (!this.apiKey) {
      return {
        valid: false,
        message: 'OpenRouter API key not configured',
        timestamp: new Date().toISOString(),
      };
    }

    logger.info('Validating OpenRouter API key');

    try {
      // Make a simple request to validate the API key
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: 5000,
      });

      if (response.status === 200) {
        logger.info('OpenRouter API key validation successful');
        return {
          valid: true,
          message: 'API key is valid and OpenRouter is accessible',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        valid: false,
        message: `Unexpected response status: ${response.status}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        logger.error('OpenRouter API key validation failed: Unauthorized');
        return {
          valid: false,
          message: 'API key is invalid or expired',
          timestamp: new Date().toISOString(),
        };
      }

      if (status === 429) {
        logger.warn('OpenRouter API key validation: Rate limited');
        return {
          valid: false,
          message: 'Rate limit exceeded - try again later',
          timestamp: new Date().toISOString(),
        };
      }

      if (status === 503) {
        logger.warn('OpenRouter API key validation: Service unavailable');
        return {
          valid: false,
          message: 'OpenRouter service is temporarily unavailable',
          timestamp: new Date().toISOString(),
        };
      }

      logger.error(`OpenRouter API key validation failed: ${error.message}`);
      return {
        valid: false,
        message: `Connection failed: ${error.message}`,
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

  isRetryableError(status, code) {
    // Retry on network errors
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ENETUNREACH') {
      return true;
    }

    // Retry on timeout
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on rate limit
    if (status === 429) {
      return true;
    }

    // Retry on server errors
    if (status >= 500) {
      return true;
    }

    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logRequest(requestData) {
    this.requestHistory.push({
      ...requestData,
      timestamp: new Date().toISOString(),
    });

    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  logError(errorData) {
    this.errorHistory.push({
      ...errorData,
      timestamp: new Date().toISOString(),
    });

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  getRequestHistory(limit = 50) {
    return {
      requests: this.requestHistory.slice(-limit),
      count: this.requestHistory.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  getErrorHistory(limit = 50) {
    return {
      errors: this.errorHistory.slice(-limit),
      count: this.errorHistory.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  getStatus() {
    return {
      initialized: this.initialized,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryCount: this.retryCount,
      retryDelay: this.retryDelay,
      supportedModels: this.supportedModels,
      requestHistorySize: this.requestHistory.length,
      errorHistorySize: this.errorHistory.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const openRouterService = new OpenRouterService();

export default openRouterService;
export { OpenRouterService };