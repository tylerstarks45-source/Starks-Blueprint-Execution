import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIModelRegistryService {
  constructor() {
    this.models = new Map();
    this.initializeDefaultModels();
    this.initialized = true;
    logger.info('AIModelRegistryService initialized');
  }

  initializeDefaultModels() {
    const defaultModels = [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'summarization'],
        maxTokens: 200000,
        inputCostPerToken: 0.000003,
        outputCostPerToken: 0.000015,
        status: 'available',
        description: 'Fast and capable model for most tasks',
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'reasoning'],
        maxTokens: 200000,
        inputCostPerToken: 0.000015,
        outputCostPerToken: 0.000075,
        status: 'available',
        description: 'Most capable model for complex reasoning',
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'image-understanding'],
        maxTokens: 128000,
        inputCostPerToken: 0.00001,
        outputCostPerToken: 0.00003,
        status: 'available',
        description: 'Advanced reasoning and code generation',
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'image-understanding'],
        maxTokens: 128000,
        inputCostPerToken: 0.000005,
        outputCostPerToken: 0.000015,
        status: 'available',
        description: 'Optimized model with improved performance',
      },
      {
        id: 'google/gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'summarization'],
        maxTokens: 1000000,
        inputCostPerToken: 0.0000075,
        outputCostPerToken: 0.00003,
        status: 'available',
        description: 'Fast model with large context window',
      },
      {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1',
        provider: 'deepseek',
        capabilities: ['text-generation', 'code-generation', 'analysis', 'reasoning'],
        maxTokens: 128000,
        inputCostPerToken: 0.0000055,
        outputCostPerToken: 0.0000275,
        status: 'available',
        description: 'Reasoning-focused model',
      },
    ];

    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });

    logger.info(`Initialized ${defaultModels.length} default models`);
  }

  registerModel(modelId, modelName, provider, capabilities) {
    if (!modelId || !modelName || !provider || !Array.isArray(capabilities)) {
      throw new Error('Model ID, name, provider, and capabilities array are required');
    }

    if (this.models.has(modelId)) {
      logger.warn(`Model already registered: ${modelId}`);
      return this.models.get(modelId);
    }

    const model = {
      id: modelId,
      name: modelName,
      provider,
      capabilities,
      maxTokens: 128000,
      inputCostPerToken: 0.00001,
      outputCostPerToken: 0.00003,
      status: 'available',
      description: `${modelName} model`,
      registeredAt: new Date().toISOString(),
    };

    this.models.set(modelId, model);
    logger.info(`Model registered: ${modelId}`);

    return model;
  }

  getRegisteredModels() {
    return Array.from(this.models.values()).filter(m => m.status === 'available');
  }

  getModelById(modelId) {
    if (!modelId || typeof modelId !== 'string') {
      return null;
    }

    return this.models.get(modelId) || null;
  }

  getModelsByCapability(capability) {
    if (!capability || typeof capability !== 'string') {
      throw new Error('Capability is required and must be a string');
    }

    return Array.from(this.models.values()).filter(
      m => m.capabilities && m.capabilities.includes(capability) && m.status === 'available'
    );
  }

  isModelAvailable(modelId) {
    if (!modelId || typeof modelId !== 'string') {
      return false;
    }

    const model = this.models.get(modelId);
    return model && model.status === 'available';
  }

  getDefaultModel() {
    const defaultModel = Array.from(this.models.values()).find(
      m => m.id === 'anthropic/claude-3.5-sonnet' && m.status === 'available'
    );

    if (!defaultModel) {
      const available = this.getRegisteredModels();
      return available.length > 0 ? available[0] : null;
    }

    return defaultModel;
  }

  updateModelStatus(modelId, status) {
    if (!modelId || !status) {
      throw new Error('Model ID and status are required');
    }

    const validStatuses = ['available', 'unavailable', 'deprecated', 'maintenance'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    model.status = status;
    logger.info(`Model status updated: ${modelId} -> ${status}`);

    return model;
  }

  getModelCostInfo(modelId) {
    if (!modelId || typeof modelId !== 'string') {
      throw new Error('Model ID is required and must be a string');
    }

    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return {
      modelId,
      inputCostPerToken: model.inputCostPerToken,
      outputCostPerToken: model.outputCostPerToken,
      maxTokens: model.maxTokens,
      timestamp: new Date().toISOString(),
    };
  }

  getAllModels() {
    return {
      models: Array.from(this.models.values()),
      count: this.models.size,
      availableCount: this.getRegisteredModels().length,
      timestamp: new Date().toISOString(),
    };
  }

  getModelsByProvider(provider) {
    if (!provider || typeof provider !== 'string') {
      throw new Error('Provider is required and must be a string');
    }

    return Array.from(this.models.values()).filter(
      m => m.provider === provider && m.status === 'available'
    );
  }
}

const aiModelRegistryService = new AIModelRegistryService();

export default aiModelRegistryService;
export { AIModelRegistryService };