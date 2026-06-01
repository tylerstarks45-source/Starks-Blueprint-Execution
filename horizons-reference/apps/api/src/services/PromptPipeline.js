import logger from '../utils/logger.js';

class PromptPipeline {
  constructor() {
    this.pipelines = new Map();
    this.pipelineIdCounter = 0;
  }

  createPipeline(stages = []) {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error('Pipeline must have at least one stage');
    }

    const pipelineId = `pipeline-${Date.now()}-${++this.pipelineIdCounter}`;

    const pipeline = {
      id: pipelineId,
      stages: [],
      status: 'created',
      createdAt: new Date().toISOString(),
      config: {
        parallel: false,
        stopOnError: true,
        timeout: 30000,
      },
    };

    stages.forEach((stage, index) => {
      const validatedStage = this.validateStage(stage, index);
      pipeline.stages.push(validatedStage);
    });

    this.pipelines.set(pipelineId, pipeline);
    logger.info(`Prompt pipeline created: ${pipelineId} with ${pipeline.stages.length} stages`);

    return pipeline;
  }

  validateStage(stage, index) {
    if (!stage) {
      throw new Error(`Stage ${index} is null or undefined`);
    }

    if (typeof stage !== 'object') {
      throw new Error(`Stage ${index} must be an object`);
    }

    if (!stage.name) {
      throw new Error(`Stage ${index} must have a name`);
    }

    if (!stage.type) {
      throw new Error(`Stage ${index} must have a type`);
    }

    const validTypes = ['prompt-build', 'transform', 'validate', 'chain', 'condition'];
    if (!validTypes.includes(stage.type)) {
      throw new Error(`Stage ${index} has invalid type: ${stage.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      id: stage.id || `stage-${index}`,
      name: stage.name,
      type: stage.type,
      config: stage.config || {},
      input: stage.input || {},
      output: stage.output || {},
      dependencies: Array.isArray(stage.dependencies) ? stage.dependencies : [],
      index,
    };
  }

  addStage(pipelineId, stage) {
    const pipeline = this.getPipeline(pipelineId);

    const validatedStage = this.validateStage(stage, pipeline.stages.length);
    pipeline.stages.push(validatedStage);

    logger.info(`Stage added to pipeline ${pipelineId}: ${validatedStage.name}`);

    return pipeline;
  }

  getPipeline(pipelineId) {
    if (!pipelineId) {
      throw new Error('Pipeline ID is required');
    }

    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    return pipeline;
  }

  validatePipelineStructure(pipelineId) {
    const pipeline = this.getPipeline(pipelineId);
    const errors = [];
    const warnings = [];

    // Check minimum stages
    if (pipeline.stages.length === 0) {
      errors.push('Pipeline must have at least one stage');
    }

    // Validate each stage
    pipeline.stages.forEach((stage, index) => {
      if (!stage.id) {
        errors.push(`Stage ${index} has no id`);
      }

      if (!stage.name) {
        errors.push(`Stage ${index} has no name`);
      }

      // Check dependencies exist
      if (stage.dependencies && stage.dependencies.length > 0) {
        stage.dependencies.forEach(depId => {
          const depExists = pipeline.stages.some(s => s.id === depId);
          if (!depExists) {
            errors.push(`Stage ${index} depends on non-existent stage: ${depId}`);
          }
        });
      }

      // Check for circular dependencies
      if (this.hasCircularDependency(pipeline, stage.id)) {
        errors.push(`Stage ${index} has circular dependency`);
      }
    });

    // Check for orphaned stages
    const firstStage = pipeline.stages[0];
    if (firstStage && firstStage.dependencies && firstStage.dependencies.length > 0) {
      warnings.push('First stage has dependencies - may not execute');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stageCount: pipeline.stages.length,
    };
  }

  hasCircularDependency(pipeline, stageId, visited = new Set(), recursionStack = new Set()) {
    if (recursionStack.has(stageId)) {
      return true;
    }

    if (visited.has(stageId)) {
      return false;
    }

    visited.add(stageId);
    recursionStack.add(stageId);

    const stage = pipeline.stages.find(s => s.id === stageId);
    if (stage && stage.dependencies) {
      for (const depId of stage.dependencies) {
        if (this.hasCircularDependency(pipeline, depId, visited, recursionStack)) {
          return true;
        }
      }
    }

    recursionStack.delete(stageId);
    return false;
  }

  preparePipelineExecution(pipelineId) {
    const pipeline = this.getPipeline(pipelineId);
    const validation = this.validatePipelineStructure(pipelineId);

    if (!validation.valid) {
      throw new Error(`Invalid pipeline: ${validation.errors.join(', ')}`);
    }

    const executionOrder = this.getExecutionOrder(pipelineId);

    const prepared = {
      pipelineId,
      executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      executionOrder,
      stageCount: pipeline.stages.length,
      status: 'prepared',
      createdAt: new Date().toISOString(),
      config: pipeline.config,
    };

    logger.info(`Pipeline execution prepared: ${prepared.executionId}`);
    return prepared;
  }

  getExecutionOrder(pipelineId) {
    const pipeline = this.getPipeline(pipelineId);
    const order = [];
    const visited = new Set();

    const visit = (stageId) => {
      if (visited.has(stageId)) {
        return;
      }

      const stage = pipeline.stages.find(s => s.id === stageId);
      if (!stage) return;

      // Visit dependencies first
      if (stage.dependencies && stage.dependencies.length > 0) {
        stage.dependencies.forEach(depId => visit(depId));
      }

      visited.add(stageId);
      order.push(stageId);
    };

    // Visit all stages
    pipeline.stages.forEach(stage => visit(stage.id));

    return order;
  }

  getStageRequirements(stageId) {
    if (!stageId) {
      throw new Error('Stage ID is required');
    }

    const requirements = {
      stageId,
      inputRequirements: [],
      outputRequirements: [],
      dependencies: [],
      capabilities: [],
    };

    // Find stage in any pipeline
    for (const pipeline of this.pipelines.values()) {
      const stage = pipeline.stages.find(s => s.id === stageId);
      if (stage) {
        requirements.inputRequirements = Object.keys(stage.input);
        requirements.outputRequirements = Object.keys(stage.output);
        requirements.dependencies = stage.dependencies;
        requirements.type = stage.type;
        break;
      }
    }

    return requirements;
  }

  chainPrompts(prompts = []) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('Prompts array is required and must not be empty');
    }

    const chain = {
      id: `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompts,
      chainLength: prompts.length,
      status: 'prepared',
      createdAt: new Date().toISOString(),
      config: {
        sequential: true,
        passOutputAsInput: true,
      },
    };

    logger.info(`Prompt chain prepared: ${chain.id} with ${chain.chainLength} prompts`);
    return chain;
  }

  getPipelineSummary(pipelineId) {
    const pipeline = this.getPipeline(pipelineId);
    const validation = this.validatePipelineStructure(pipelineId);
    const executionOrder = this.getExecutionOrder(pipelineId);

    return {
      id: pipeline.id,
      stageCount: pipeline.stages.length,
      executionOrder,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      status: pipeline.status,
      createdAt: pipeline.createdAt,
    };
  }

  listPipelines() {
    return Array.from(this.pipelines.values());
  }
}

export default PromptPipeline;
export { PromptPipeline };