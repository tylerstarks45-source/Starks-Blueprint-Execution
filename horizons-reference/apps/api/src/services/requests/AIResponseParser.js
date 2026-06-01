import 'dotenv/config';
import logger from '../../utils/logger.js';

class AIResponseParser {
  constructor() {
    this.initialized = true;
    logger.info('AIResponseParser initialized');
  }

  parseResponse(response) {
    if (!response) {
      logger.error('Response is null or undefined');
      throw new Error('Response is null or undefined');
    }

    if (typeof response !== 'object') {
      logger.error('Response is not an object');
      throw new Error('Response must be an object');
    }

    // Validate response structure
    const structureValidation = this.validateResponseStructure(response);
    if (!structureValidation.valid) {
      logger.error(`Response structure validation failed: ${structureValidation.error}`);
      throw new Error(`Response structure validation failed: ${structureValidation.error}`);
    }

    // Extract text content
    const text = this.extractTextContent(response);

    // Extract token counts
    const tokens = this.extractTokenCounts(response);

    // Extract model name
    const model = this.extractModelName(response);

    // Extract provider name
    const provider = this.extractProviderName(model);

    // Extract metadata
    const metadata = this.extractMetadata(response);

    const parsed = {
      text,
      tokens,
      model,
      provider,
      metadata,
      timestamp: new Date().toISOString(),
    };

    logger.debug(`Response parsed successfully: model=${model}, tokens=${tokens.total}`);
    return parsed;
  }

  validateResponseStructure(response) {
    if (!response || typeof response !== 'object') {
      return {
        valid: false,
        error: 'Response must be a valid object',
      };
    }

    // Check required fields
    if (!('choices' in response)) {
      return {
        valid: false,
        error: 'Response missing required field: choices',
      };
    }

    if (!('usage' in response)) {
      return {
        valid: false,
        error: 'Response missing required field: usage',
      };
    }

    if (!('model' in response)) {
      return {
        valid: false,
        error: 'Response missing required field: model',
      };
    }

    // Check choices structure
    if (!Array.isArray(response.choices) || response.choices.length === 0) {
      return {
        valid: false,
        error: 'Choices must be a non-empty array',
      };
    }

    const choice = response.choices[0];
    if (!choice || typeof choice !== 'object') {
      return {
        valid: false,
        error: 'First choice must be a valid object',
      };
    }

    if (!('message' in choice)) {
      return {
        valid: false,
        error: 'Choice missing required field: message',
      };
    }

    const message = choice.message;
    if (!message || typeof message !== 'object') {
      return {
        valid: false,
        error: 'Message must be a valid object',
      };
    }

    if (!('content' in message)) {
      return {
        valid: false,
        error: 'Message missing required field: content',
      };
    }

    // Check usage structure
    const usage = response.usage;
    if (!usage || typeof usage !== 'object') {
      return {
        valid: false,
        error: 'Usage must be a valid object',
      };
    }

    if (!('prompt_tokens' in usage)) {
      return {
        valid: false,
        error: 'Usage missing required field: prompt_tokens',
      };
    }

    if (!('completion_tokens' in usage)) {
      return {
        valid: false,
        error: 'Usage missing required field: completion_tokens',
      };
    }

    if (!('total_tokens' in usage)) {
      return {
        valid: false,
        error: 'Usage missing required field: total_tokens',
      };
    }

    return { valid: true };
  }

  extractTextContent(response) {
    try {
      const content = response.choices[0].message.content;

      if (typeof content !== 'string') {
        logger.warn('Response content is not a string, converting to string');
        return String(content);
      }

      if (content.trim().length === 0) {
        logger.warn('Response content is empty');
        return '';
      }

      return content;
    } catch (error) {
      logger.error(`Failed to extract text content: ${error.message}`);
      throw new Error('Failed to extract text content from response');
    }
  }

  extractTokenCounts(response) {
    try {
      const usage = response.usage;

      const inputTokens = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0;
      const outputTokens = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0;
      const totalTokens = typeof usage.total_tokens === 'number' ? usage.total_tokens : inputTokens + outputTokens;

      return {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      };
    } catch (error) {
      logger.error(`Failed to extract token counts: ${error.message}`);
      throw new Error('Failed to extract token counts from response');
    }
  }

  extractModelName(response) {
    try {
      const model = response.model;

      if (typeof model !== 'string') {
        logger.warn('Model name is not a string');
        return 'unknown';
      }

      if (model.trim().length === 0) {
        logger.warn('Model name is empty');
        return 'unknown';
      }

      return model;
    } catch (error) {
      logger.error(`Failed to extract model name: ${error.message}`);
      return 'unknown';
    }
  }

  extractProviderName(model) {
    try {
      if (!model || typeof model !== 'string') {
        return 'unknown';
      }

      // Extract provider from model name (e.g., 'anthropic/claude-3.5-sonnet' -> 'anthropic')
      if (model.includes('/')) {
        return model.split('/')[0];
      }

      // Fallback: infer from model name
      if (model.includes('claude')) return 'anthropic';
      if (model.includes('gpt')) return 'openai';
      if (model.includes('gemini')) return 'google';
      if (model.includes('deepseek')) return 'deepseek';

      return 'unknown';
    } catch (error) {
      logger.error(`Failed to extract provider name: ${error.message}`);
      return 'unknown';
    }
  }

  extractMetadata(response) {
    try {
      const metadata = {
        finishReason: response.choices[0].finish_reason || 'unknown',
        messageRole: response.choices[0].message.role || 'assistant',
        id: response.id || null,
        created: response.created || null,
      };

      return metadata;
    } catch (error) {
      logger.error(`Failed to extract metadata: ${error.message}`);
      return {
        finishReason: 'unknown',
        messageRole: 'assistant',
        id: null,
        created: null,
      };
    }
  }

  handleMalformedResponse(error) {
    logger.error(`Malformed response error: ${error.message}`);

    return {
      text: '',
      tokens: {
        input: 0,
        output: 0,
        total: 0,
      },
      model: 'unknown',
      provider: 'unknown',
      metadata: {
        finishReason: 'error',
        messageRole: 'assistant',
        id: null,
        created: null,
      },
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

const aiResponseParser = new AIResponseParser();

export default aiResponseParser;
export { AIResponseParser };