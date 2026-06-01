import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIRequestValidator {
  constructor() {
    this.supportedModels = [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'openai/gpt-4-turbo',
      'openai/gpt-4o',
      'google/gemini-2.0-flash',
      'deepseek/deepseek-chat',
    ];
    this.initialized = true;
    logger.info('AIRequestValidator initialized');
  }

  validateRequest(prompt, model, systemPrompt = null, temperature = 0.7, maxTokens = 2048) {
    const errors = [];

    // Validate prompt
    const promptValidation = this.validatePrompt(prompt);
    if (!promptValidation.valid) {
      errors.push(promptValidation.error);
    }

    // Validate model
    const modelValidation = this.validateModel(model);
    if (!modelValidation.valid) {
      errors.push(modelValidation.error);
    }

    // Validate system prompt if provided
    if (systemPrompt !== null && systemPrompt !== undefined) {
      const systemPromptValidation = this.validateSystemPrompt(systemPrompt);
      if (!systemPromptValidation.valid) {
        errors.push(systemPromptValidation.error);
      }
    }

    // Validate temperature
    const temperatureValidation = this.validateTemperature(temperature);
    if (!temperatureValidation.valid) {
      errors.push(temperatureValidation.error);
    }

    // Validate maxTokens
    const maxTokensValidation = this.validateMaxTokens(maxTokens);
    if (!maxTokensValidation.valid) {
      errors.push(maxTokensValidation.error);
    }

    if (errors.length > 0) {
      logger.warn(`AI request validation failed: ${errors.join('; ')}`);
      return {
        valid: false,
        errors,
        code: 'VALIDATION_FAILED',
      };
    }

    logger.debug('AI request validation passed');
    return {
      valid: true,
      errors: [],
      code: 'VALIDATION_PASSED',
      timestamp: new Date().toISOString(),
    };
  }

  validatePrompt(prompt) {
    if (!prompt) {
      return {
        valid: false,
        error: 'Prompt is required',
      };
    }

    if (typeof prompt !== 'string') {
      return {
        valid: false,
        error: 'Prompt must be a string',
      };
    }

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length === 0) {
      return {
        valid: false,
        error: 'Prompt cannot be empty',
      };
    }

    if (trimmedPrompt.length < 1) {
      return {
        valid: false,
        error: 'Prompt must be at least 1 character',
      };
    }

    if (trimmedPrompt.length > 10000) {
      return {
        valid: false,
        error: 'Prompt exceeds maximum length of 10000 characters',
      };
    }

    if (this.hasControlCharacters(prompt)) {
      return {
        valid: false,
        error: 'Prompt contains invalid control characters',
      };
    }

    return {
      valid: true,
      message: 'Prompt is valid',
    };
  }

  validateModel(model) {
    if (!model) {
      return {
        valid: false,
        error: 'Model is required',
      };
    }

    if (typeof model !== 'string') {
      return {
        valid: false,
        error: 'Model must be a string',
      };
    }

    if (!this.supportedModels.includes(model)) {
      return {
        valid: false,
        error: `Model '${model}' is not supported. Supported models: ${this.supportedModels.join(', ')}`,
      };
    }

    return {
      valid: true,
      message: 'Model is valid',
    };
  }

  validateSystemPrompt(systemPrompt) {
    // System prompt is optional
    if (systemPrompt === null || systemPrompt === undefined) {
      return {
        valid: true,
        message: 'System prompt is optional',
      };
    }

    if (typeof systemPrompt !== 'string') {
      return {
        valid: false,
        error: 'System prompt must be a string',
      };
    }

    if (systemPrompt.trim().length === 0) {
      return {
        valid: false,
        error: 'System prompt cannot be empty',
      };
    }

    if (systemPrompt.length > 5000) {
      return {
        valid: false,
        error: 'System prompt exceeds maximum length of 5000 characters',
      };
    }

    if (this.hasControlCharacters(systemPrompt)) {
      return {
        valid: false,
        error: 'System prompt contains invalid control characters',
      };
    }

    return {
      valid: true,
      message: 'System prompt is valid',
    };
  }

  validateTemperature(temperature) {
    // Temperature is optional, default 0.7
    if (temperature === null || temperature === undefined) {
      return {
        valid: true,
        message: 'Temperature is optional, using default 0.7',
      };
    }

    if (typeof temperature !== 'number') {
      return {
        valid: false,
        error: 'Temperature must be a number',
      };
    }

    if (temperature < 0 || temperature > 2) {
      return {
        valid: false,
        error: 'Temperature must be between 0 and 2',
      };
    }

    return {
      valid: true,
      message: 'Temperature is valid',
    };
  }

  validateMaxTokens(maxTokens) {
    // maxTokens is optional, default 2048
    if (maxTokens === null || maxTokens === undefined) {
      return {
        valid: true,
        message: 'maxTokens is optional, using default 2048',
      };
    }

    if (typeof maxTokens !== 'number') {
      return {
        valid: false,
        error: 'maxTokens must be a number',
      };
    }

    if (!Number.isInteger(maxTokens)) {
      return {
        valid: false,
        error: 'maxTokens must be an integer',
      };
    }

    if (maxTokens < 1 || maxTokens > 4096) {
      return {
        valid: false,
        error: 'maxTokens must be between 1 and 4096',
      };
    }

    return {
      valid: true,
      message: 'maxTokens is valid',
    };
  }

  hasControlCharacters(str) {
    if (typeof str !== 'string') return false;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Control characters: 0-31 and 127, except tab (9), newline (10), carriage return (13)
      if ((code >= 0 && code <= 31 && code !== 9 && code !== 10 && code !== 13) || code === 127) {
        return true;
      }
    }
    return false;
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = '';
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      // Keep if not a control character (or if it's tab/newline/cr)
      if (!((code >= 0 && code <= 31 && code !== 9 && code !== 10 && code !== 13) || code === 127)) {
        sanitized += input[i];
      }
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  sanitizeRequest(prompt, model, systemPrompt = null) {
    return {
      prompt: this.sanitizeInput(prompt),
      model: this.sanitizeInput(model),
      systemPrompt: systemPrompt ? this.sanitizeInput(systemPrompt) : null,
    };
  }

  getSupportedModels() {
    return {
      models: this.supportedModels,
      count: this.supportedModels.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiRequestValidator = new AIRequestValidator();

export default aiRequestValidator;
export { AIRequestValidator };