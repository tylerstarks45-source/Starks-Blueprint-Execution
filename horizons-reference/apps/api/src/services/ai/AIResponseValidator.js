import logger from '../../utils/logger.js';

class AIResponseValidator {
  constructor() {
    this.validationRules = this.initializeValidationRules();
  }

  initializeValidationRules() {
    return {
      required: ['choices', 'usage'],
      choicesStructure: {
        required: ['message', 'finish_reason'],
        messageRequired: ['content', 'role'],
      },
      usageStructure: {
        required: ['prompt_tokens', 'completion_tokens', 'total_tokens'],
      },
    };
  }

  validateResponse(response) {
    if (!response) {
      return {
        valid: false,
        error: 'Response is null or undefined',
        code: 'EMPTY_RESPONSE',
      };
    }

    const structureCheck = this.checkResponseStructure(response);
    if (!structureCheck.valid) {
      return structureCheck;
    }

    const contentCheck = this.validateContent(response.choices[0].message.content);
    if (!contentCheck.valid) {
      return contentCheck;
    }

    return {
      valid: true,
      message: 'Response is valid',
      code: 'VALID_RESPONSE',
    };
  }

  checkResponseStructure(response) {
    const rules = this.validationRules;

    // Check required top-level fields
    for (const field of rules.required) {
      if (!(field in response)) {
        return {
          valid: false,
          error: `Missing required field: ${field}`,
          code: 'MISSING_FIELD',
          field,
        };
      }
    }

    // Check choices structure
    if (!Array.isArray(response.choices) || response.choices.length === 0) {
      return {
        valid: false,
        error: 'Choices must be a non-empty array',
        code: 'INVALID_CHOICES',
      };
    }

    const choice = response.choices[0];
    for (const field of rules.choicesStructure.required) {
      if (!(field in choice)) {
        return {
          valid: false,
          error: `Missing required field in choice: ${field}`,
          code: 'MISSING_CHOICE_FIELD',
          field,
        };
      }
    }

    // Check message structure
    const message = choice.message;
    if (typeof message !== 'object' || message === null) {
      return {
        valid: false,
        error: 'Message must be an object',
        code: 'INVALID_MESSAGE',
      };
    }

    for (const field of rules.choicesStructure.messageRequired) {
      if (!(field in message)) {
        return {
          valid: false,
          error: `Missing required field in message: ${field}`,
          code: 'MISSING_MESSAGE_FIELD',
          field,
        };
      }
    }

    // Check usage structure
    const usage = response.usage;
    if (typeof usage !== 'object' || usage === null) {
      return {
        valid: false,
        error: 'Usage must be an object',
        code: 'INVALID_USAGE',
      };
    }

    for (const field of rules.usageStructure.required) {
      if (!(field in usage)) {
        return {
          valid: false,
          error: `Missing required field in usage: ${field}`,
          code: 'MISSING_USAGE_FIELD',
          field,
        };
      }
    }

    return { valid: true, code: 'STRUCTURE_VALID' };
  }

  validateContent(content) {
    // Check content is a string
    if (typeof content !== 'string') {
      return {
        valid: false,
        error: 'Content must be a string',
        code: 'INVALID_CONTENT_TYPE',
      };
    }

    // Check content is not empty
    if (content.trim().length === 0) {
      return {
        valid: false,
        error: 'Content cannot be empty',
        code: 'EMPTY_CONTENT',
      };
    }

    // Check content length
    if (content.length > 1000000) {
      return {
        valid: false,
        error: 'Content exceeds maximum length of 1,000,000 characters',
        code: 'CONTENT_TOO_LONG',
      };
    }

    return { valid: true, code: 'CONTENT_VALID' };
  }

  handleMalformedResponse(error) {
    if (!error) {
      return {
        handled: false,
        error: 'Error object is null or undefined',
        code: 'NULL_ERROR',
      };
    }

    const errorInfo = {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN_ERROR',
      status: error.status || error.response?.status || null,
      timestamp: new Date().toISOString(),
    };

    // Categorize error
    if (error.response?.status >= 400 && error.response?.status < 500) {
      errorInfo.category = 'CLIENT_ERROR';
      errorInfo.retryable = false;
    } else if (error.response?.status >= 500) {
      errorInfo.category = 'SERVER_ERROR';
      errorInfo.retryable = true;
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorInfo.category = 'TIMEOUT_ERROR';
      errorInfo.retryable = true;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorInfo.category = 'NETWORK_ERROR';
      errorInfo.retryable = true;
    } else {
      errorInfo.category = 'UNKNOWN_ERROR';
      errorInfo.retryable = false;
    }

    logger.error(`AI Response Error [${errorInfo.category}]:`, errorInfo);

    return {
      handled: true,
      ...errorInfo,
    };
  }

  extractValidData(response) {
    if (!response) {
      return null;
    }

    const validation = this.validateResponse(response);
    if (!validation.valid) {
      return null;
    }

    return {
      content: response.choices[0].message.content,
      role: response.choices[0].message.role,
      finishReason: response.choices[0].finish_reason,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  sanitizeResponse(response) {
    if (!response) {
      return null;
    }

    const extracted = this.extractValidData(response);
    if (!extracted) {
      return null;
    }

    return {
      content: extracted.content.trim(),
      role: extracted.role,
      finishReason: extracted.finishReason,
      usage: extracted.usage,
      sanitizedAt: new Date().toISOString(),
    };
  }

  validateBatchResponses(responses) {
    if (!Array.isArray(responses)) {
      return {
        valid: false,
        error: 'Responses must be an array',
        code: 'INVALID_BATCH',
      };
    }

    const results = {
      valid: true,
      total: responses.length,
      validCount: 0,
      invalidCount: 0,
      errors: [],
    };

    responses.forEach((response, index) => {
      const validation = this.validateResponse(response);
      if (validation.valid) {
        results.validCount += 1;
      } else {
        results.valid = false;
        results.invalidCount += 1;
        results.errors.push({
          index,
          ...validation,
        });
      }
    });

    return results;
  }
}

export default AIResponseValidator;
export { AIResponseValidator };