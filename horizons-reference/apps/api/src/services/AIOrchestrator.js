import logger from '../utils/logger.js';

class AIOrchestrator {
  constructor() {
    this.taskStructures = new Map();
    this.routingLogic = new Map();
    this.blueprintConfigs = new Map();
    this.modelSelectionRules = new Map();
    this.initializeDefaults();
  }

  initializeDefaults() {
    const defaultTaskTypes = [
      'blueprint_analysis',
      'prompt_generation',
      'model_selection',
      'plan_creation',
      'response_validation',
    ];

    defaultTaskTypes.forEach(taskType => {
      this.taskStructures.set(taskType, this.createDefaultTaskStructure(taskType));
    });

    logger.info('AIOrchestrator initialized with default task structures');
  }

  createDefaultTaskStructure(taskType) {
    const structures = {
      blueprint_analysis: {
        taskType,
        requiredInputs: ['blueprint'],
        optionalInputs: ['depth', 'format'],
        expectedOutputs: ['analysis', 'metadata', 'complexity'],
        validationRules: ['blueprint_format', 'structure_integrity'],
      },
      prompt_generation: {
        taskType,
        requiredInputs: ['template', 'variables'],
        optionalInputs: ['systemPrompt', 'context'],
        expectedOutputs: ['prompt', 'metadata'],
        validationRules: ['template_validity', 'variable_substitution'],
      },
      model_selection: {
        taskType,
        requiredInputs: ['taskType', 'constraints'],
        optionalInputs: ['preferences', 'budget'],
        expectedOutputs: ['selectedModel', 'alternatives', 'reasoning'],
        validationRules: ['capability_match', 'constraint_satisfaction'],
      },
      plan_creation: {
        taskType,
        requiredInputs: ['blueprint'],
        optionalInputs: ['optimizationStrategy'],
        expectedOutputs: ['executionPlan', 'steps', 'dependencies'],
        validationRules: ['plan_structure', 'dependency_integrity'],
      },
      response_validation: {
        taskType,
        requiredInputs: ['response', 'schema'],
        optionalInputs: ['strictMode'],
        expectedOutputs: ['isValid', 'errors', 'warnings'],
        validationRules: ['schema_compliance', 'content_quality'],
      },
    };

    return structures[taskType] || structures.blueprint_analysis;
  }

  prepareTaskStructure(taskType, requirements = {}) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const baseStructure = this.taskStructures.get(taskType);
    if (!baseStructure) {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    const prepared = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskType,
      baseStructure,
      requirements,
      inputs: {
        required: baseStructure.requiredInputs,
        optional: baseStructure.optionalInputs,
      },
      outputs: {
        expected: baseStructure.expectedOutputs,
      },
      validation: {
        rules: baseStructure.validationRules,
        enabled: true,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    logger.info(`Task structure prepared: ${prepared.id} (type: ${taskType})`);
    return prepared;
  }

  prepareRoutingLogic(taskType) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const routing = {
      taskType,
      id: `routing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      strategy: this.determineRoutingStrategy(taskType),
      targetServices: this.getTargetServices(taskType),
      fallbackServices: this.getFallbackServices(taskType),
      loadBalancing: 'round-robin',
      queueing: {
        enabled: true,
        priority: 'normal',
        maxWaitTime: 30000,
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
      },
      timeout: 30000,
      metadata: {
        createdAt: new Date().toISOString(),
      },
    };

    this.routingLogic.set(routing.id, routing);
    logger.info(`Routing logic prepared: ${routing.id} (strategy: ${routing.strategy})`);
    return routing;
  }

  prepareBlueprintParsing(blueprint) {
    if (!blueprint) {
      throw new Error('Blueprint is required');
    }

    const parsing = {
      id: `parse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      parseStrategy: 'hierarchical',
      extractionRules: {
        requirements: true,
        workflows: true,
        prompts: true,
        config: true,
      },
      validationRules: [
        'structure_integrity',
        'version_compatibility',
        'dependency_resolution',
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        blueprintName: blueprint.name,
      },
    };

    this.blueprintConfigs.set(parsing.id, parsing);
    logger.info(`Blueprint parsing prepared: ${parsing.id}`);
    return parsing;
  }

  prepareModelSelection(taskType) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const selection = {
      id: `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskType,
      selectionCriteria: {
        capability: this.getRequiredCapabilities(taskType),
        performance: 'balanced',
        cost: 'optimized',
        latency: 'acceptable',
      },
      modelPreferences: {
        primary: this.getPrimaryModels(taskType),
        fallback: this.getFallbackModels(taskType),
      },
      constraints: {
        maxTokens: 128000,
        maxCost: null,
        maxLatency: 30000,
      },
      metadata: {
        createdAt: new Date().toISOString(),
      },
    };

    this.modelSelectionRules.set(selection.id, selection);
    logger.info(`Model selection prepared: ${selection.id}`);
    return selection;
  }

  getOrchestratorStatus() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      components: {
        taskStructures: this.taskStructures.size,
        routingLogic: this.routingLogic.size,
        blueprintConfigs: this.blueprintConfigs.size,
        modelSelectionRules: this.modelSelectionRules.size,
      },
      taskTypes: Array.from(this.taskStructures.keys()),
      health: {
        initialized: true,
        ready: true,
      },
    };
  }

  determineRoutingStrategy(taskType) {
    const strategies = {
      blueprint_analysis: 'direct',
      prompt_generation: 'direct',
      model_selection: 'decision-tree',
      plan_creation: 'direct',
      response_validation: 'direct',
    };
    return strategies[taskType] || 'direct';
  }

  getTargetServices(taskType) {
    const services = {
      blueprint_analysis: ['blueprint-analyzer'],
      prompt_generation: ['prompt-builder'],
      model_selection: ['model-router'],
      plan_creation: ['system-planner'],
      response_validation: ['response-validator'],
    };
    return services[taskType] || ['default-service'];
  }

  getFallbackServices(taskType) {
    const fallbacks = {
      blueprint_analysis: ['default-analyzer'],
      prompt_generation: ['default-builder'],
      model_selection: ['default-router'],
      plan_creation: ['default-planner'],
      response_validation: ['default-validator'],
    };
    return fallbacks[taskType] || ['default-service'];
  }

  getRequiredCapabilities(taskType) {
    const capabilities = {
      blueprint_analysis: ['analysis', 'text-generation'],
      prompt_generation: ['text-generation'],
      model_selection: ['analysis'],
      plan_creation: ['analysis', 'reasoning'],
      response_validation: ['analysis'],
    };
    return capabilities[taskType] || [];
  }

  getPrimaryModels(taskType) {
    const models = {
      blueprint_analysis: ['claude-3-5-sonnet', 'gpt-4o'],
      prompt_generation: ['claude-3-5-sonnet', 'gpt-4o'],
      model_selection: ['claude-3-opus', 'gpt-4-turbo'],
      plan_creation: ['claude-3-opus', 'deepseek-r1'],
      response_validation: ['claude-3-5-sonnet', 'gpt-4o'],
    };
    return models[taskType] || ['claude-3-5-sonnet'];
  }

  getFallbackModels(taskType) {
    const models = {
      blueprint_analysis: ['gemini-2-flash'],
      prompt_generation: ['gemini-2-flash'],
      model_selection: ['gpt-4o'],
      plan_creation: ['claude-3-5-sonnet'],
      response_validation: ['gemini-2-flash'],
    };
    return models[taskType] || ['gemini-2-flash'];
  }
}

export default AIOrchestrator;
export { AIOrchestrator };