import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIRequestService {
  constructor() {
    this.supportedModels = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4-turbo',
      'google/gemini-2.0-flash',
      'deepseek/deepseek-chat',
    ];
    this.maxPromptLength = 10000;
    this.maxSystemPromptLength = 5000;
    this.initialized = true;
    logger.info('AIRequestService initialized');
  }

  validatePrompt(prompt) {
    if (!prompt) {
      logger.warn('Prompt validation failed: prompt is required');
      return {
        valid: false,
        error: 'Prompt is required',
      };
    }

    if (typeof prompt !== 'string') {
      logger.warn('Prompt validation failed: prompt must be a string');
      return {
        valid: false,
        error: 'Prompt must be a string',
      };
    }

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length === 0) {
      logger.warn('Prompt validation failed: prompt cannot be empty');
      return {
        valid: false,
        error: 'Prompt cannot be empty',
      };
    }

    if (trimmedPrompt.length > this.maxPromptLength) {
      logger.warn(`Prompt validation failed: prompt exceeds max length of ${this.maxPromptLength}`);
      return {
        valid: false,
        error: `Prompt exceeds maximum length of ${this.maxPromptLength} characters`,
      };
    }

    logger.debug(`Prompt validation passed: ${trimmedPrompt.length} characters`);
    return {
      valid: true,
      message: 'Prompt is valid',
    };
  }

  validateModel(model) {
    if (!model) {
      logger.warn('Model validation failed: model is required');
      return {
        valid: false,
        error: 'Model is required',
      };
    }

    if (typeof model !== 'string') {
      logger.warn('Model validation failed: model must be a string');
      return {
        valid: false,
        error: 'Model must be a string',
      };
    }

    if (!this.supportedModels.includes(model)) {
      logger.warn(`Model validation failed: ${model} is not a valid model`);
      return {
        valid: false,
        error: `Model '${model}' is not supported. Valid models: ${this.supportedModels.join(', ')}`,
      };
    }

    logger.debug(`Model validation passed: ${model}`);
    return {
      valid: true,
      message: 'Model is valid',
    };
  }

  validateSystemPrompt(systemPrompt) {
    // System prompt is optional
    if (!systemPrompt) {
      logger.debug('System prompt validation: not provided (optional)');
      return {
        valid: true,
        message: 'System prompt is optional',
      };
    }

    if (typeof systemPrompt !== 'string') {
      logger.warn('System prompt validation failed: must be a string');
      return {
        valid: false,
        error: 'System prompt must be a string',
      };
    }

    if (systemPrompt.trim().length === 0) {
      logger.warn('System prompt validation failed: cannot be empty');
      return {
        valid: false,
        error: 'System prompt cannot be empty',
      };
    }

    if (systemPrompt.length > this.maxSystemPromptLength) {
      logger.warn(`System prompt validation failed: exceeds max length of ${this.maxSystemPromptLength}`);
      return {
        valid: false,
        error: `System prompt exceeds maximum length of ${this.maxSystemPromptLength} characters`,
      };
    }

    logger.debug(`System prompt validation passed: ${systemPrompt.length} characters`);
    return {
      valid: true,
      message: 'System prompt is valid',
    };
  }

  validateRequest(prompt, model, systemPrompt) {
    // Validate prompt
    const promptValidation = this.validatePrompt(prompt);
    if (!promptValidation.valid) {
      return promptValidation;
    }

    // Validate model
    const modelValidation = this.validateModel(model);
    if (!modelValidation.valid) {
      return modelValidation;
    }

    // Validate system prompt if provided
    if (systemPrompt) {
      const systemPromptValidation = this.validateSystemPrompt(systemPrompt);
      if (!systemPromptValidation.valid) {
        return systemPromptValidation;
      }
    }

    logger.debug('Request validation passed');
    return {
      valid: true,
      message: 'Request is valid',
    };
  }

  getSupportedModels() {
    return {
      models: this.supportedModels,
      count: this.supportedModels.length,
      timestamp: new Date().toISOString(),
    };
  }

  getValidationLimits() {
    return {
      maxPromptLength: this.maxPromptLength,
      maxSystemPromptLength: this.maxSystemPromptLength,
      supportedModels: this.supportedModels,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiRequestService = new AIRequestService();

export default aiRequestService;
export { AIRequestService };