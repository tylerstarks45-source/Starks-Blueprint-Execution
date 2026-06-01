import 'dotenv/config';
import aiModelRegistryService from './AIModelRegistryService.js';
import logger from '../../utils/logger.js';

class AIRequestValidationService {
  constructor() {
    this.maxPromptLength = 100000;
    this.minPromptLength = 1;
    this.abusePatterns = [
      /jailbreak/i,
      /ignore instructions/i,
      /bypass/i,
      /override/i,
      /system prompt/i,
      /admin/i,
      /root/i,
      /sudo/i,
    ];
    this.initialized = true;
    logger.info('AIRequestValidationService initialized');
  }

  validatePrompt(prompt) {
    if (!prompt) {
      return {
        valid: false,
        error: 'Prompt is required',
        code: 'MISSING_PROMPT',
      };
    }

    if (typeof prompt !== 'string') {
      return {
        valid: false,
        error: 'Prompt must be a string',
        code: 'INVALID_PROMPT_TYPE',
      };
    }

    if (prompt.trim().length < this.minPromptLength) {
      return {
        valid: false,
        error: `Prompt must be at least ${this.minPromptLength} character(s)`,
        code: 'PROMPT_TOO_SHORT',
      };
    }

    if (prompt.length > this.maxPromptLength) {
      return {
        valid: false,
        error: `Prompt exceeds maximum length of ${this.maxPromptLength} characters`,
        code: 'PROMPT_TOO_LONG',
      };
    }

    return {
      valid: true,
      message: 'Prompt is valid',
      code: 'PROMPT_VALID',
    };
  }

  validateModel(model) {
    if (!model) {
      return {
        valid: false,
        error: 'Model is required',
        code: 'MISSING_MODEL',
      };
    }

    if (typeof model !== 'string') {
      return {
        valid: false,
        error: 'Model must be a string',
        code: 'INVALID_MODEL_TYPE',
      };
    }

    if (!aiModelRegistryService.isModelAvailable(model)) {
      return {
        valid: false,
        error: `Model not available: ${model}`,
        code: 'MODEL_NOT_AVAILABLE',
      };
    }

    return {
      valid: true,
      message: 'Model is valid',
      code: 'MODEL_VALID',
    };
  }

  validateTokenLimit(prompt, model) {
    if (!prompt || !model) {
      return {
        valid: false,
        error: 'Prompt and model are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    // Rough estimation: ~4 characters per token
    const estimatedTokens = Math.ceil(prompt.length / 4);

    const modelInfo = aiModelRegistryService.getModelById(model);
    if (!modelInfo) {
      return {
        valid: false,
        error: `Model not found: ${model}`,
        code: 'MODEL_NOT_FOUND',
      };
    }

    if (estimatedTokens > modelInfo.maxTokens) {
      return {
        valid: false,
        error: `Prompt exceeds model token limit (${estimatedTokens} > ${modelInfo.maxTokens})`,
        code: 'TOKEN_LIMIT_EXCEEDED',
        estimatedTokens,
        maxTokens: modelInfo.maxTokens,
      };
    }

    return {
      valid: true,
      message: 'Token limit is valid',
      code: 'TOKEN_LIMIT_VALID',
      estimatedTokens,
      maxTokens: modelInfo.maxTokens,
    };
  }

  validateUserQuota(userId, model) {
    if (!userId || !model) {
      return {
        valid: false,
        error: 'User ID and model are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    // Placeholder for quota validation
    // In a real implementation, this would check against user's credit balance
    return {
      valid: true,
      message: 'User quota is valid',
      code: 'QUOTA_VALID',
    };
  }

  validateRequestFormat(request) {
    if (!request || typeof request !== 'object') {
      return {
        valid: false,
        error: 'Request must be a valid object',
        code: 'INVALID_REQUEST_TYPE',
      };
    }

    if (!request.prompt) {
      return {
        valid: false,
        error: 'Request missing required field: prompt',
        code: 'MISSING_PROMPT',
      };
    }

    if (!request.model) {
      return {
        valid: false,
        error: 'Request missing required field: model',
        code: 'MISSING_MODEL',
      };
    }

    if (request.options && typeof request.options !== 'object') {
      return {
        valid: false,
        error: 'Options must be an object',
        code: 'INVALID_OPTIONS_TYPE',
      };
    }

    return {
      valid: true,
      message: 'Request format is valid',
      code: 'REQUEST_FORMAT_VALID',
    };
  }

  sanitizePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return '';
    }

    // Remove leading/trailing whitespace
    let sanitized = prompt.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  checkForAbusePatterns(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return {
        safe: true,
        reason: null,
      };
    }

    for (const pattern of this.abusePatterns) {
      if (pattern.test(prompt)) {
        logger.warn(`Abuse pattern detected: ${pattern.source}`);
        return {
          safe: false,
          reason: `Potential abuse pattern detected: ${pattern.source}`,
        };
      }
    }

    return {
      safe: true,
      reason: null,
    };
  }

  addAbusePattern(pattern) {
    if (!pattern || !(pattern instanceof RegExp)) {
      throw new Error('Pattern must be a valid RegExp');
    }

    this.abusePatterns.push(pattern);
    logger.info(`Abuse pattern added: ${pattern.source}`);

    return {
      success: true,
      pattern: pattern.source,
      totalPatterns: this.abusePatterns.length,
      timestamp: new Date().toISOString(),
    };
  }

  getAbusePatterns() {
    return {
      patterns: this.abusePatterns.map(p => p.source),
      count: this.abusePatterns.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiRequestValidationService = new AIRequestValidationService();

export default aiRequestValidationService;
export { AIRequestValidationService };