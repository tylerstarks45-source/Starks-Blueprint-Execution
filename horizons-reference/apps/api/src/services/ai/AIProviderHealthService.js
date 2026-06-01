import 'dotenv/config';
import axios from 'axios';
import logger from '../../utils/logger.js';

class AIProviderHealthService {
  constructor() {
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.timeout = 5000;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.cache = new Map();
    this.lastHealthCheck = null;
    this.healthMetrics = {
      responseTime: 0,
      availabilityPercentage: 100,
      lastChecked: null,
    };
    this.initialized = !!this.apiKey;
    logger.info('AIProviderHealthService initialized');
  }

  async getProviderHealth() {
    logger.info('Fetching provider health status');

    // Check cache
    const cached = this.getFromCache('provider-health');
    if (cached) {
      logger.debug('Returning cached provider health data');
      return cached;
    }

    try {
      const startTime = Date.now();

      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;
      const models = response.data.data || [];

      // Group models by provider
      const providerMap = {};

      models.forEach(model => {
        const provider = model.owned_by || 'unknown';
        if (!providerMap[provider]) {
          providerMap[provider] = [];
        }
        providerMap[provider].push(model.id);
      });

      // Build provider health object
      const providers = {};
      Object.entries(providerMap).forEach(([provider, modelIds]) => {
        providers[provider] = {
          available: true,
          modelCount: modelIds.length,
          models: modelIds,
        };
      });

      const result = {
        providers,
        responseTime: duration,
        timestamp: new Date().toISOString(),
      };

      // Cache result
      this.setCache('provider-health', result);

      logger.info(`Provider health fetched: ${Object.keys(providers).length} providers available`);

      return result;
    } catch (error) {
      logger.error(`Failed to fetch provider health: ${error.message}`);
      throw error;
    }
  }

  async getModelHealth(model) {
    if (!model || typeof model !== 'string') {
      logger.warn('Model health check: invalid model parameter');
      return {
        model: model || 'unknown',
        available: false,
        provider: 'unknown',
        message: 'Model parameter is required and must be a string',
        timestamp: new Date().toISOString(),
      };
    }

    logger.info(`Checking health for model: ${model}`);

    try {
      const startTime = Date.now();

      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;
      const models = response.data.data || [];
      const modelData = models.find(m => m.id === model);

      if (!modelData) {
        logger.warn(`Model health check: ${model} not found`);
        return {
          model,
          available: false,
          provider: 'unknown',
          message: `Model '${model}' not found in available models`,
          timestamp: new Date().toISOString(),
        };
      }

      logger.info(`Model health check passed: ${model} is available`);

      return {
        model,
        available: true,
        provider: modelData.owned_by || 'unknown',
        responseTime: duration,
        contextLength: modelData.context_length || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Model health check failed for ${model}: ${error.message}`);
      return {
        model,
        available: false,
        provider: 'unknown',
        message: `Health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getHealthMetrics() {
    logger.info('Fetching health metrics');

    // Check cache
    const cached = this.getFromCache('health-metrics');
    if (cached) {
      logger.debug('Returning cached health metrics');
      return cached;
    }

    try {
      const startTime = Date.now();

      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
        timeout: this.timeout,
      });

      const duration = Date.now() - startTime;
      const models = response.data.data || [];

      // Group by provider
      const providerMap = {};
      models.forEach(model => {
        const provider = model.owned_by || 'unknown';
        if (!providerMap[provider]) {
          providerMap[provider] = { count: 0, available: true };
        }
        providerMap[provider].count += 1;
      });

      // Calculate availability percentage
      const totalProviders = Object.keys(providerMap).length;
      const availableProviders = Object.values(providerMap).filter(p => p.available).length;
      const availabilityPercentage = totalProviders > 0 ? (availableProviders / totalProviders) * 100 : 0;

      // Determine overall health
      let overallHealth = 'healthy';
      if (availabilityPercentage < 100) {
        overallHealth = 'degraded';
      }
      if (availabilityPercentage < 50) {
        overallHealth = 'unavailable';
      }

      const result = {
        overallHealth,
        providers: providerMap,
        metrics: {
          responseTime: duration,
          availabilityPercentage: Math.round(availabilityPercentage),
          totalProviders,
          availableProviders,
          totalModels: models.length,
        },
        timestamp: new Date().toISOString(),
      };

      // Cache result
      this.setCache('health-metrics', result);

      logger.info(`Health metrics: ${overallHealth} (${availabilityPercentage.toFixed(1)}% availability)`);

      return result;
    } catch (error) {
      logger.error(`Failed to fetch health metrics: ${error.message}`);
      throw error;
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

  setCache(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheExpiry,
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  clearCache() {
    this.cache.clear();
    logger.info('Health service cache cleared');
  }

  getStatus() {
    return {
      initialized: this.initialized,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      cacheExpiry: this.cacheExpiry,
      cacheSize: this.cache.size,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiProviderHealthService = new AIProviderHealthService();

export default aiProviderHealthService;
export { AIProviderHealthService };