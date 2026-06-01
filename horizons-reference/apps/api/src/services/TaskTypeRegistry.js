import logger from '../utils/logger.js';

class TaskTypeRegistry {
  constructor() {
    this.taskTypes = new Map();
    this.initializeDefaultTaskTypes();
  }

  initializeDefaultTaskTypes() {
    const defaultTypes = [
      {
        id: 'blueprint_analysis',
        name: 'Blueprint Analysis',
        description: 'Analyze blueprint structure and extract metadata',
        category: 'analysis',
        requiredInputs: ['blueprint'],
        optionalInputs: ['depth', 'format'],
        expectedOutputs: ['analysis', 'metadata', 'complexity'],
        capabilities: ['analysis', 'text-generation'],
        estimatedDuration: 5000,
      },
      {
        id: 'prompt_generation',
        name: 'Prompt Generation',
        description: 'Generate prompts from templates and variables',
        category: 'generation',
        requiredInputs: ['template', 'variables'],
        optionalInputs: ['systemPrompt', 'context'],
        expectedOutputs: ['prompt', 'metadata'],
        capabilities: ['text-generation'],
        estimatedDuration: 2000,
      },
      {
        id: 'model_selection',
        name: 'Model Selection',
        description: 'Select optimal model for task',
        category: 'routing',
        requiredInputs: ['taskType', 'constraints'],
        optionalInputs: ['preferences', 'budget'],
        expectedOutputs: ['selectedModel', 'alternatives', 'reasoning'],
        capabilities: ['analysis', 'reasoning'],
        estimatedDuration: 3000,
      },
      {
        id: 'plan_creation',
        name: 'Plan Creation',
        description: 'Create execution plan from blueprint',
        category: 'planning',
        requiredInputs: ['blueprint'],
        optionalInputs: ['optimizationStrategy'],
        expectedOutputs: ['executionPlan', 'steps', 'dependencies'],
        capabilities: ['analysis', 'reasoning'],
        estimatedDuration: 4000,
      },
      {
        id: 'response_validation',
        name: 'Response Validation',
        description: 'Validate AI responses against schema',
        category: 'validation',
        requiredInputs: ['response', 'schema'],
        optionalInputs: ['strictMode'],
        expectedOutputs: ['isValid', 'errors', 'warnings'],
        capabilities: ['analysis'],
        estimatedDuration: 1000,
      },
    ];

    defaultTypes.forEach(type => {
      this.taskTypes.set(type.id, type);
    });

    logger.info(`TaskTypeRegistry initialized with ${defaultTypes.length} default task types`);
  }

  getTaskType(typeId) {
    if (!typeId) {
      throw new Error('Task type ID is required');
    }

    const taskType = this.taskTypes.get(typeId);
    if (!taskType) {
      throw new Error(`Task type not found: ${typeId}`);
    }

    return taskType;
  }

  getAllTaskTypes() {
    return Array.from(this.taskTypes.values());
  }

  getTaskRequirements(typeId) {
    const taskType = this.getTaskType(typeId);

    return {
      taskTypeId: typeId,
      requiredInputs: taskType.requiredInputs,
      optionalInputs: taskType.optionalInputs,
      expectedOutputs: taskType.expectedOutputs,
      capabilities: taskType.capabilities,
      estimatedDuration: taskType.estimatedDuration,
    };
  }

  getTaskMetadata(typeId) {
    const taskType = this.getTaskType(typeId);

    return {
      id: taskType.id,
      name: taskType.name,
      description: taskType.description,
      category: taskType.category,
      capabilities: taskType.capabilities,
      estimatedDuration: taskType.estimatedDuration,
      inputCount: taskType.requiredInputs.length + taskType.optionalInputs.length,
      outputCount: taskType.expectedOutputs.length,
    };
  }

  addTaskType(typeData) {
    if (!typeData) {
      throw new Error('Task type data is required');
    }

    const validation = this.validateTaskType(typeData);
    if (!validation.valid) {
      throw new Error(`Invalid task type: ${validation.errors.join(', ')}`);
    }

    const { id } = typeData;

    if (this.taskTypes.has(id)) {
      throw new Error(`Task type already exists: ${id}`);
    }

    const taskType = {
      ...typeData,
      addedAt: new Date().toISOString(),
    };

    this.taskTypes.set(id, taskType);
    logger.info(`Task type added: ${id}`);

    return taskType;
  }

  validateTaskType(typeData) {
    if (!typeData) {
      return { valid: false, errors: ['Task type data is required'] };
    }

    const errors = [];

    if (!typeData.id || typeof typeData.id !== 'string') {
      errors.push('Task type must have a valid id (string)');
    }

    if (!typeData.name || typeof typeData.name !== 'string') {
      errors.push('Task type must have a valid name (string)');
    }

    if (!typeData.description || typeof typeData.description !== 'string') {
      errors.push('Task type must have a valid description (string)');
    }

    if (!typeData.category || typeof typeData.category !== 'string') {
      errors.push('Task type must have a valid category (string)');
    }

    if (!Array.isArray(typeData.requiredInputs)) {
      errors.push('Task type must have requiredInputs array');
    }

    if (!Array.isArray(typeData.optionalInputs)) {
      errors.push('Task type must have optionalInputs array');
    }

    if (!Array.isArray(typeData.expectedOutputs)) {
      errors.push('Task type must have expectedOutputs array');
    }

    if (!Array.isArray(typeData.capabilities) || typeData.capabilities.length === 0) {
      errors.push('Task type must have at least one capability');
    }

    if (typeData.estimatedDuration !== undefined && typeof typeData.estimatedDuration !== 'number') {
      errors.push('estimatedDuration must be a number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getTaskTypesByCategory(category) {
    if (!category) {
      throw new Error('Category is required');
    }

    return Array.from(this.taskTypes.values()).filter(type => type.category === category);
  }

  getTaskTypesByCapability(capability) {
    if (!capability) {
      throw new Error('Capability is required');
    }

    return Array.from(this.taskTypes.values()).filter(type =>
      type.capabilities && type.capabilities.includes(capability)
    );
  }

  updateTaskType(typeId, updates) {
    const taskType = this.getTaskType(typeId);
    const updated = {
      ...taskType,
      ...updates,
      id: taskType.id,
      updatedAt: new Date().toISOString(),
    };
    this.taskTypes.set(typeId, updated);
    logger.info(`Task type updated: ${typeId}`);
    return updated;
  }

  listTaskTypesByCategory() {
    const grouped = {};
    this.taskTypes.forEach(type => {
      if (!grouped[type.category]) {
        grouped[type.category] = [];
      }
      grouped[type.category].push(type);
    });
    return grouped;
  }
}

export default TaskTypeRegistry;
export { TaskTypeRegistry };