import logger from '../utils/logger.js';

class ModelRouter {
  constructor() {
    this.routingRules = new Map();
    this.taskModelMappings = new Map();
    this.initializeDefaultMappings();
  }

  initializeDefaultMappings() {
    const mappings = {
      blueprint_analysis: {
        primary: ['claude-3-5-sonnet', 'gpt-4o'],
        fallback: ['gemini-2-flash'],
        capabilities: ['analysis', 'text-generation'],
      },
      prompt_generation: {
        primary: ['claude-3-5-sonnet', 'gpt-4o'],
        fallback: ['gemini-2-flash'],
        capabilities: ['text-generation'],
      },
      model_selection: {
        primary: ['claude-3-opus', 'gpt-4-turbo'],
        fallback: ['gpt-4o'],
        capabilities: ['analysis', 'reasoning'],
      },
      plan_creation: {
        primary: ['claude-3-opus', 'deepseek-r1'],
        fallback: ['claude-3-5-sonnet'],
        capabilities: ['analysis', 'reasoning'],
      },
      response_validation: {
        primary: ['claude-3-5-sonnet', 'gpt-4o'],
        fallback: ['gemini-2-flash'],
        capabilities: ['analysis'],
      },
    };

    Object.entries(mappings).forEach(([taskType, mapping]) => {
      this.taskModelMappings.set(taskType, mapping);
    });

    logger.info('ModelRouter initialized with default task-to-model mappings');
  }

  prepareModelRouting(taskType) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const mapping = this.taskModelMappings.get(taskType);
    if (!mapping) {
      throw new Error(`No model mapping found for task type: ${taskType}`);
    }

    const routing = {
      id: `routing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskType,
      strategy: 'capability-based',
      primaryModels: mapping.primary,
      fallbackModels: mapping.fallback,
      requiredCapabilities: mapping.capabilities,
      selectionCriteria: {
        capability: 'required',
        performance: 'balanced',
        cost: 'optimized',
        latency: 'acceptable',
      },
      constraints: {
        maxTokens: 128000,
        maxLatency: 30000,
      },
      metadata: {
        createdAt: new Date().toISOString(),
      },
    };

    logger.info(`Model routing prepared: ${routing.id}`);
    return routing;
  }

  mapTaskToModels(taskType) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const mapping = this.taskModelMappings.get(taskType);
    if (!mapping) {
      throw new Error(`No model mapping found for task type: ${taskType}`);
    }

    return {
      taskType,
      mapping: {
        primary: mapping.primary,
        fallback: mapping.fallback,
      },
      capabilities: mapping.capabilities,
      totalModels: mapping.primary.length + mapping.fallback.length,
    };
  }

  optimizeModelSelection(taskType, constraints = {}) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const mapping = this.taskModelMappings.get(taskType);
    if (!mapping) {
      throw new Error(`No model mapping found for task type: ${taskType}`);
    }

    const optimization = {
      taskType,
      optimizationId: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      constraints,
      selectedModels: [],
      reasoning: [],
    };

    // Apply constraints
    let candidates = [...mapping.primary];

    if (constraints.maxCost) {
      optimization.reasoning.push(`Filtering models by cost constraint: ${constraints.maxCost}`);
      // In real implementation, would filter by cost
    }

    if (constraints.maxLatency) {
      optimization.reasoning.push(`Filtering models by latency constraint: ${constraints.maxLatency}ms`);
      // In real implementation, would filter by latency
    }

    if (constraints.preferredProvider) {
      optimization.reasoning.push(`Prioritizing provider: ${constraints.preferredProvider}`);
      // In real implementation, would reorder by provider
    }

    optimization.selectedModels = candidates.length > 0 ? candidates : mapping.fallback;
    optimization.reasoning.push(`Selected ${optimization.selectedModels.length} model(s) for task`);

    return optimization;
  }

  selectFallbackModel(primaryModel) {
    if (!primaryModel) {
      throw new Error('Primary model is required');
    }

    const fallback = {
      primaryModel,
      fallbackModel: null,
      reason: '',
    };

    // Find task type for primary model
    for (const [taskType, mapping] of this.taskModelMappings.entries()) {
      if (mapping.primary.includes(primaryModel)) {
        fallback.fallbackModel = mapping.fallback[0] || 'gemini-2-flash';
        fallback.reason = `Fallback for ${taskType} task`;
        break;
      }
    }

    if (!fallback.fallbackModel) {
      fallback.fallbackModel = 'gemini-2-flash';
      fallback.reason = 'Default fallback model';
    }

    return fallback;
  }

  getModelRoutingMetadata(taskType) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const mapping = this.taskModelMappings.get(taskType);
    if (!mapping) {
      throw new Error(`No model mapping found for task type: ${taskType}`);
    }

    return {
      taskType,
      primaryModelCount: mapping.primary.length,
      fallbackModelCount: mapping.fallback.length,
      requiredCapabilities: mapping.capabilities,
      models: {
        primary: mapping.primary,
        fallback: mapping.fallback,
      },
    };
  }

  validateModelRouting(routing) {
    if (!routing) {
      return {
        valid: false,
        errors: ['Routing object is required'],
      };
    }

    const errors = [];
    const warnings = [];

    if (!routing.taskType) {
      errors.push('Routing must specify a task type');
    }

    if (!routing.primaryModels || !Array.isArray(routing.primaryModels) || routing.primaryModels.length === 0) {
      errors.push('Routing must have at least one primary model');
    }

    if (!routing.fallbackModels || !Array.isArray(routing.fallbackModels)) {
      warnings.push('Routing should have fallback models');
    }

    if (!routing.requiredCapabilities || !Array.isArray(routing.requiredCapabilities)) {
      warnings.push('Routing should specify required capabilities');
    }

    if (routing.constraints) {
      if (routing.constraints.maxTokens && typeof routing.constraints.maxTokens !== 'number') {
        errors.push('maxTokens constraint must be a number');
      }
      if (routing.constraints.maxLatency && typeof routing.constraints.maxLatency !== 'number') {
        errors.push('maxLatency constraint must be a number');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  registerTaskModelMapping(taskType, mapping) {
    if (!taskType || !mapping) {
      throw new Error('Task type and mapping are required');
    }

    if (!Array.isArray(mapping.primary) || mapping.primary.length === 0) {
      throw new Error('Mapping must have at least one primary model');
    }

    this.taskModelMappings.set(taskType, mapping);
    logger.info(`Task-to-model mapping registered: ${taskType}`);

    return mapping;
  }

  listTaskModelMappings() {
    const mappings = {};
    this.taskModelMappings.forEach((mapping, taskType) => {
      mappings[taskType] = mapping;
    });
    return mappings;
  }
}

export default ModelRouter;
export { ModelRouter };