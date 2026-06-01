import logger from './logger.js';

class OpenRouterValidator {
  validateOpenRouterResponse(response) {
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
    if (!response || typeof response !== 'object') {
      return {
        valid: false,
        error: 'Response must be a valid object',
        code: 'INVALID_RESPONSE_TYPE',
      };
    }

    // Check required top-level fields
    if (!('choices' in response)) {
      return {
        valid: false,
        error: 'Response missing required field: choices',
        code: 'MISSING_CHOICES',
      };
    }

    if (!('usage' in response)) {
      return {
        valid: false,
        error: 'Response missing required field: usage',
        code: 'MISSING_USAGE',
      };
    }

    if (!('model' in response)) {
      return {
        valid: false,
        error: 'Response missing required field: model',
        code: 'MISSING_MODEL',
      };
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
    if (!choice || typeof choice !== 'object') {
      return {
        valid: false,
        error: 'First choice must be a valid object',
        code: 'INVALID_CHOICE_OBJECT',
      };
    }

    if (!('message' in choice)) {
      return {
        valid: false,
        error: 'Choice missing required field: message',
        code: 'MISSING_MESSAGE',
      };
    }

    if (!('finish_reason' in choice)) {
      return {
        valid: false,
        error: 'Choice missing required field: finish_reason',
        code: 'MISSING_FINISH_REASON',
      };
    }

    // Check message structure
    const message = choice.message;
    if (!message || typeof message !== 'object') {
      return {
        valid: false,
        error: 'Message must be a valid object',
        code: 'INVALID_MESSAGE_OBJECT',
      };
    }

    if (!('content' in message)) {
      return {
        valid: false,
        error: 'Message missing required field: content',
        code: 'MISSING_CONTENT',
      };
    }

    if (!('role' in message)) {
      return {
        valid: false,
        error: 'Message missing required field: role',
        code: 'MISSING_ROLE',
      };
    }

    // Check usage structure
    const usage = response.usage;
    if (!usage || typeof usage !== 'object') {
      return {
        valid: false,
        error: 'Usage must be a valid object',
        code: 'INVALID_USAGE_OBJECT',
      };
    }

    if (!('prompt_tokens' in usage)) {
      return {
        valid: false,
        error: 'Usage missing required field: prompt_tokens',
        code: 'MISSING_PROMPT_TOKENS',
      };
    }

    if (!('completion_tokens' in usage)) {
      return {
        valid: false,
        error: 'Usage missing required field: completion_tokens',
        code: 'MISSING_COMPLETION_TOKENS',
      };
    }

    if (!('total_tokens' in usage)) {
      return {
        valid: false,
        error: 'Usage missing required field: total_tokens',
        code: 'MISSING_TOTAL_TOKENS',
      };
    }

    return { valid: true, code: 'STRUCTURE_VALID' };
  }

  validateContent(content) {
    if (content === null || content === undefined) {
      return {
        valid: false,
        error: 'Content is null or undefined',
        code: 'NULL_CONTENT',
      };
    }

    if (typeof content !== 'string') {
      return {
        valid: false,
        error: 'Content must be a string',
        code: 'INVALID_CONTENT_TYPE',
      };
    }

    if (content.trim().length === 0) {
      return {
        valid: false,
        error: 'Content cannot be empty',
        code: 'EMPTY_CONTENT',
      };
    }

    if (content.length > 1000000) {
      return {
        valid: false,
        error: 'Content exceeds maximum length of 1,000,000 characters',
        code: 'CONTENT_TOO_LONG',
      };
    }

    return { valid: true, code: 'CONTENT_VALID' };
  }

  categorizeError(error) {
    if (!error) {
      return {
        category: 'UNKNOWN_ERROR',
        retryable: false,
        message: 'Unknown error occurred',
      };
    }

    const errorMsg = error.message || '';
    const errorCode = error.code || '';
    const status = error.response?.status || error.status || null;

    // Network errors
    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ENETUNREACH') {
      return {
        category: 'NETWORK_ERROR',
        retryable: true,
        message: 'Network connection failed',
      };
    }

    // Timeout errors
    if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT' || errorMsg.includes('timeout')) {
      return {
        category: 'TIMEOUT_ERROR',
        retryable: true,
        message: 'Request timed out',
      };
    }

    // Rate limit errors
    if (status === 429 || errorMsg.includes('rate limit')) {
      return {
        category: 'RATE_LIMIT_ERROR',
        retryable: true,
        message: 'Rate limit exceeded',
      };
    }

    // Invalid model errors
    if (status === 404 || errorMsg.includes('model') || errorMsg.includes('not found')) {
      return {
        category: 'INVALID_MODEL_ERROR',
        retryable: false,
        message: 'Model not found or invalid',
      };
    }

    // Authentication errors
    if (status === 401 || status === 403 || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
      return {
        category: 'AUTH_ERROR',
        retryable: false,
        message: 'Authentication failed',
      };
    }

    // Bad request errors
    if (status === 400 || errorMsg.includes('bad request')) {
      return {
        category: 'BAD_REQUEST_ERROR',
        retryable: false,
        message: 'Invalid request format',
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        category: 'SERVER_ERROR',
        retryable: true,
        message: 'OpenRouter server error',
      };
    }

    // Client errors
    if (status >= 400 && status < 500) {
      return {
        category: 'CLIENT_ERROR',
        retryable: false,
        message: 'Client error in request',
      };
    }

    // Malformed response
    if (errorMsg.includes('JSON') || errorMsg.includes('parse')) {
      return {
        category: 'MALFORMED_RESPONSE_ERROR',
        retryable: true,
        message: 'Response parsing failed',
      };
    }

    // API errors
    if (status >= 400) {
      return {
        category: 'API_ERROR',
        retryable: status >= 500,
        message: 'API request failed',
      };
    }

    return {
      category: 'UNKNOWN_ERROR',
      retryable: false,
      message: 'Unknown error occurred',
    };
  }

  getSafeErrorMessage(error) {
    if (!error) {
      return 'An unknown error occurred';
    }

    const categorized = this.categorizeError(error);

    const messages = {
      NETWORK_ERROR: 'Network connection failed. Please check your connection and try again.',
      TIMEOUT_ERROR: 'Request timed out. The API took too long to respond. Please try again.',
      RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
      INVALID_MODEL_ERROR: 'The specified model is not available or does not exist.',
      AUTH_ERROR: 'Authentication failed. Please check your API configuration.',
      BAD_REQUEST_ERROR: 'Invalid request format. Please check your input parameters.',
      SERVER_ERROR: 'OpenRouter service is temporarily unavailable. Please try again later.',
      CLIENT_ERROR: 'Request error. Please check your input and try again.',
      MALFORMED_RESPONSE_ERROR: 'Invalid response from API. Please try again.',
      API_ERROR: 'API request failed. Please try again.',
      UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    };

    return messages[categorized.category] || messages.UNKNOWN_ERROR;
  }

  extractTokenCount(response) {
    if (!response || !response.usage) {
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    }

    const usage = response.usage;
    return {
      promptTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0,
      completionTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0,
      totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : 0,
    };
  }
}

const validator = new OpenRouterValidator();

export default validator;
export { OpenRouterValidator };