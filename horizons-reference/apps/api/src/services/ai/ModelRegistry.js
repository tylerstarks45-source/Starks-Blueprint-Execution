import 'dotenv/config';
import logger from '../../utils/logger.js';

class ModelRegistry {
  constructor() {
    this.models = this.initializeModels();
    this.initialized = true;
    logger.info('ModelRegistry initialized with models');
  }

  initializeModels() {
    return [
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Claude',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'summarization'],
        maxTokens: 200000,
        inputCostPerToken: 0.000003,
        outputCostPerToken: 0.000015,
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Claude',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'reasoning'],
        maxTokens: 200000,
        inputCostPerToken: 0.000015,
        outputCostPerToken: 0.000075,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'reasoning'],
        maxTokens: 8192,
        inputCostPerToken: 0.00003,
        outputCostPerToken: 0.00006,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'image-understanding'],
        maxTokens: 128000,
        inputCostPerToken: 0.00001,
        outputCostPerToken: 0.00003,
      },
      {
        id: 'gemini-2-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'summarization'],
        maxTokens: 1000000,
        inputCostPerToken: 0.0000075,
        outputCostPerToken: 0.00003,
      },
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'DeepSeek',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'reasoning'],
        maxTokens: 128000,
        inputCostPerToken: 0.0000055,
        outputCostPerToken: 0.0000275,
      },
    ];
  }

  getModels() {
    return this.models;
  }

  getModelById(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('Model ID is required and must be a string');
    }

    const model = this.models.find(m => m.id === id);
    if (!model) {
      logger.error(`Model not found: ${id}`);
      throw new Error(`Model not found: ${id}`);
    }

    return model;
  }

  getModelsByProvider(provider) {
    if (!provider || typeof provider !== 'string') {
      throw new Error('Provider is required and must be a string');
    }

    return this.models.filter(m => m.provider === provider);
  }

  getModelsByCapability(capability) {
    if (!capability || typeof capability !== 'string') {
      throw new Error('Capability is required and must be a string');
    }

    return this.models.filter(m => m.capabilities.includes(capability));
  }

  validateModel(id) {
    try {
      this.getModelById(id);
      return { valid: true, message: 'Model is valid' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

const modelRegistry = new ModelRegistry();

export default modelRegistry;
export { ModelRegistry };