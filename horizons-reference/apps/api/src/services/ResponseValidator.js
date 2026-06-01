import logger from '../utils/logger.js';

class ResponseValidator {
  constructor() {
    this.validationRules = new Map();
    this.initializeDefaultRules();
  }

  initializeDefaultRules() {
    const rules = {
      'blueprint_analysis': {
        requiredFields: ['analysis', 'metadata'],
        contentChecks: ['non-empty', 'valid-json'],
      },
      'prompt_generation': {
        requiredFields: ['prompt'],
        contentChecks: ['non-empty', 'valid-string'],
      },
      'model_selection': {
        requiredFields: ['selectedModel', 'alternatives'],
        contentChecks: ['non-empty', 'valid-structure'],
      },
      'plan_creation': {
        requiredFields: ['executionPlan', 'steps'],
        contentChecks: ['non-empty', 'valid-structure'],
      },
      'response_validation': {
        requiredFields: ['isValid'],
        contentChecks: ['non-empty', 'valid-boolean'],
      },
    };

    Object.entries(rules).forEach(([key, value]) => {
      this.validationRules.set(key, value);
    });
  }

  validatePipelineResponse(response, stage) {
    if (!response) {
      return {
        valid: false,
        error: 'Response is null or undefined',
        code: 'EMPTY_RESPONSE',
      };
    }

    if (!stage) {
      return {
        valid: false,
        error: 'Stage information is required',
        code: 'MISSING_STAGE',
      };
    }

    const validation = {
      stageId: stage.id,
      stageName: stage.name,
      stageType: stage.type,
      responseValid: false,
      checks: [],
    };

    // Check response structure
    const structureCheck = this.checkResponseStructure(response, stage);
    validation.checks.push(structureCheck);

    // Check response quality
    const qualityCheck = this.checkResponseQuality(response);
    validation.checks.push(qualityCheck);

    validation.responseValid = structureCheck.passed && qualityCheck.passed;

    logger.info(`Pipeline response validated for stage ${stage.id}: ${validation.responseValid}`);

    return validation;
  }

  checkResponseStructure(response, stage) {
    const check = {
      name: 'structure',
      passed: true,
      errors: [],
    };

    if (typeof response !== 'object' || response === null) {
      check.passed = false;
      check.errors.push('Response must be an object');
      return check;
    }

    // Check for required fields based on stage type
    const rules = this.validationRules.get(stage.type);
    if (rules && rules.requiredFields) {
      rules.requiredFields.forEach(field => {
        if (!(field in response)) {
          check.passed = false;
          check.errors.push(`Missing required field: ${field}`);
        }
      });
    }

    return check;
  }

  checkResponseQuality(response) {
    const check = {
      name: 'quality',
      passed: true,
      errors: [],
      warnings: [],
    };

    if (typeof response !== 'object' || response === null) {
      check.passed = false;
      check.errors.push('Response must be an object');
      return check;
    }

    // Check for empty values
    Object.entries(response).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        check.warnings.push(`Field ${key} is null or undefined`);
      }

      if (typeof value === 'string' && value.trim().length === 0) {
        check.warnings.push(`Field ${key} is empty string`);
      }
    });

    // Check response size
    const responseSize = JSON.stringify(response).length;
    if (responseSize > 10000000) {
      check.passed = false;
      check.errors.push(`Response exceeds maximum size (${responseSize} bytes)`);
    }

    return check;
  }

  handleValidationFailure(error) {
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
      timestamp: new Date().toISOString(),
    };

    // Categorize error
    if (error.message && error.message.includes('structure')) {
      errorInfo.category = 'STRUCTURE_ERROR';
      errorInfo.recoverable = false;
    } else if (error.message && error.message.includes('quality')) {
      errorInfo.category = 'QUALITY_ERROR';
      errorInfo.recoverable = true;
    } else if (error.message && error.message.includes('field')) {
      errorInfo.category = 'FIELD_ERROR';
      errorInfo.recoverable = false;
    } else {
      errorInfo.category = 'UNKNOWN_ERROR';
      errorInfo.recoverable = false;
    }

    logger.error(`Validation failure [${errorInfo.category}]:`, errorInfo);

    return {
      handled: true,
      ...errorInfo,
    };
  }

  aggregateValidationResults(results = []) {
    if (!Array.isArray(results)) {
      return {
        valid: false,
        error: 'Results must be an array',
        code: 'INVALID_RESULTS',
      };
    }

    const aggregated = {
      totalValidations: results.length,
      passedValidations: 0,
      failedValidations: 0,
      allValid: true,
      results: [],
      summary: {
        successRate: 0,
        errors: [],
        warnings: [],
      },
    };

    results.forEach(result => {
      if (result.responseValid || result.valid) {
        aggregated.passedValidations += 1;
      } else {
        aggregated.failedValidations += 1;
        aggregated.allValid = false;
      }

      aggregated.results.push(result);

      // Collect errors and warnings
      if (result.checks) {
        result.checks.forEach(check => {
          if (check.errors) {
            aggregated.summary.errors.push(...check.errors);
          }
          if (check.warnings) {
            aggregated.summary.warnings.push(...check.warnings);
          }
        });
      }
    });

    aggregated.summary.successRate = aggregated.totalValidations > 0
      ? (aggregated.passedValidations / aggregated.totalValidations) * 100
      : 0;

    return aggregated;
  }

  validateResponseChain(responses = []) {
    if (!Array.isArray(responses)) {
      return {
        valid: false,
        error: 'Responses must be an array',
        code: 'INVALID_CHAIN',
      };
    }

    const chain = {
      chainLength: responses.length,
      validations: [],
      allValid: true,
      errors: [],
    };

    responses.forEach((response, index) => {
      const validation = {
        index,
        valid: true,
        checks: [],
      };

      // Basic structure check
      if (!response || typeof response !== 'object') {
        validation.valid = false;
        validation.checks.push({
          name: 'structure',
          passed: false,
          errors: ['Response must be a non-null object'],
        });
      } else {
        // Check for content
        const hasContent = Object.keys(response).length > 0;
        validation.checks.push({
          name: 'content',
          passed: hasContent,
          errors: hasContent ? [] : ['Response is empty'],
        });
      }

      if (!validation.valid) {
        chain.allValid = false;
      }

      chain.validations.push(validation);
    });

    return chain;
  }

  registerValidationRule(stageType, rule) {
    if (!stageType || !rule) {
      throw new Error('Stage type and rule are required');
    }

    this.validationRules.set(stageType, rule);
    logger.info(`Validation rule registered for stage type: ${stageType}`);

    return rule;
  }
}

export default ResponseValidator;
export { ResponseValidator };