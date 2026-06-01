import logger from '../../utils/logger.js';

class SystemPlanner {
  constructor() {
    this.planIdCounter = 0;
  }

  createExecutionPlan(blueprint) {
    if (!blueprint) {
      throw new Error('Blueprint is required to create a plan');
    }

    if (!blueprint.workflows || blueprint.workflows.length === 0) {
      throw new Error('Blueprint must contain at least one workflow');
    }

    const plan = {
      id: `plan-${Date.now()}-${++this.planIdCounter}`,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      name: `Execution Plan for ${blueprint.name}`,
      description: blueprint.description,
      steps: [],
      executionOrder: [],
      dependencies: {},
      estimatedDuration: 0,
      createdAt: new Date().toISOString(),
    };

    // Build execution steps from workflows
    blueprint.workflows.forEach((workflow, workflowIndex) => {
      if (Array.isArray(workflow.steps)) {
        workflow.steps.forEach((step, stepIndex) => {
          const planStep = {
            id: `step-${workflowIndex}-${stepIndex}`,
            workflowId: workflow.id,
            workflowName: workflow.name,
            stepIndex,
            name: step.name || `Step ${stepIndex}`,
            type: step.type || 'task',
            action: step.action || '',
            config: step.config || {},
            dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
            estimatedDuration: step.estimatedDuration || 0,
            retryPolicy: step.retryPolicy || { maxRetries: 3, backoffMs: 1000 },
            status: 'pending',
          };

          plan.steps.push(planStep);
          plan.estimatedDuration += planStep.estimatedDuration;
        });
      }
    });

    // Build dependency graph
    plan.dependencies = this.buildDependencyGraph(plan.steps);

    // Optimize execution order
    plan.executionOrder = this.optimizeExecutionOrder(plan);

    logger.info(`Execution plan created: ${plan.id} with ${plan.steps.length} steps`);
    return plan;
  }

  validatePlanStructure(plan) {
    if (!plan) {
      return {
        valid: false,
        errors: ['Plan is required'],
        warnings: [],
      };
    }

    const errors = [];
    const warnings = [];

    // Check required fields
    if (!plan.id) {
      errors.push('Plan must have an id');
    }

    if (!plan.blueprintId) {
      errors.push('Plan must reference a blueprint');
    }

    if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
      errors.push('Plan must contain at least one step');
    }

    // Validate steps
    if (plan.steps) {
      plan.steps.forEach((step, index) => {
        if (!step.id) {
          errors.push(`Step ${index} must have an id`);
        }

        if (!step.action) {
          warnings.push(`Step ${index} has no action defined`);
        }

        // Check for circular dependencies
        if (step.dependencies && step.dependencies.includes(step.id)) {
          errors.push(`Step ${index} has a circular dependency on itself`);
        }
      });
    }

    // Validate execution order
    if (plan.executionOrder) {
      if (plan.executionOrder.length !== plan.steps.length) {
        warnings.push('Execution order length does not match step count');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  optimizeExecutionOrder(plan) {
    if (!plan || !plan.steps || plan.steps.length === 0) {
      return [];
    }

    const ordered = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (stepId) => {
      if (visited.has(stepId)) {
        return;
      }

      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected for step: ${stepId}`);
      }

      visiting.add(stepId);

      // Visit dependencies first
      const step = plan.steps.find(s => s.id === stepId);
      if (step && step.dependencies) {
        step.dependencies.forEach(depId => {
          const depExists = plan.steps.some(s => s.id === depId);
          if (depExists) {
            visit(depId);
          }
        });
      }

      visiting.delete(stepId);
      visited.add(stepId);
      ordered.push(stepId);
    };

    // Visit all steps
    try {
      plan.steps.forEach(step => {
        visit(step.id);
      });
    } catch (error) {
      logger.error(`Error optimizing execution order: ${error.message}`);
      throw error;
    }

    return ordered;
  }

  buildDependencyGraph(steps) {
    if (!Array.isArray(steps)) {
      return {};
    }

    const graph = {};

    steps.forEach(step => {
      graph[step.id] = step.dependencies || [];
    });

    return graph;
  }

  getPlanSteps(plan) {
    if (!plan || !plan.steps) {
      return [];
    }

    return plan.steps.map(step => ({
      id: step.id,
      name: step.name,
      type: step.type,
      action: step.action,
      dependencies: step.dependencies,
      estimatedDuration: step.estimatedDuration,
      status: step.status,
    }));
  }

  estimatePlanDuration(plan) {
    if (!plan || !plan.steps || plan.steps.length === 0) {
      return {
        estimatedDuration: 0,
        stepCount: 0,
        parallelizable: 0,
      };
    }

    let totalDuration = 0;
    const visited = new Set();

    const maxDepth = (stepId, depth = 0) => {
      if (visited.has(stepId)) {
        return 0;
      }

      visited.add(stepId);
      const step = plan.steps.find(s => s.id === stepId);
      if (!step) return 0;

      const deps = plan.dependencies?.[stepId] || [];
      const maxDepDuration = deps.length > 0
        ? Math.max(...deps.map(depId => maxDepth(depId)))
        : 0;

      return maxDepDuration + (step.estimatedDuration || 0);
    };

    plan.steps.forEach(step => {
      visited.clear();
      totalDuration = Math.max(totalDuration, maxDepth(step.id));
    });

    return {
      estimatedDuration: totalDuration,
      stepCount: plan.steps.length,
      parallelizable: this.countParallelizableSteps(plan),
    };
  }

  countParallelizableSteps(plan) {
    if (!plan || !plan.steps) {
      return 0;
    }

    return plan.steps.filter(step => !step.dependencies || step.dependencies.length === 0).length;
  }

  validatePlanDependencies(plan) {
    if (!plan || !plan.steps) {
      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    }

    const errors = [];
    const warnings = [];
    const stepIds = new Set(plan.steps.map(s => s.id));

    plan.steps.forEach((step, index) => {
      if (!step.dependencies || step.dependencies.length === 0) {
        return;
      }

      // Check if all dependencies exist
      step.dependencies.forEach(depId => {
        if (!stepIds.has(depId)) {
          errors.push(`Step ${index} (${step.id}) depends on non-existent step: ${depId}`);
        }
      });

      // Check for self-dependency
      if (step.dependencies.includes(step.id)) {
        errors.push(`Step ${index} (${step.id}) has a circular dependency on itself`);
      }
    });

    // Check for circular dependencies
    const visited = new Set();
    const visiting = new Set();

    const hasCircular = (stepId) => {
      if (visited.has(stepId)) {
        return false;
      }

      if (visiting.has(stepId)) {
        return true;
      }

      visiting.add(stepId);
      const step = plan.steps.find(s => s.id === stepId);

      if (step && step.dependencies) {
        for (const depId of step.dependencies) {
          if (hasCircular(depId)) {
            return true;
          }
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);
      return false;
    };

    plan.steps.forEach(step => {
      visited.clear();
      visiting.clear();
      if (hasCircular(step.id)) {
        errors.push(`Circular dependency detected involving step: ${step.id}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getPlanSummary(plan) {
    if (!plan) {
      return null;
    }

    const validation = this.validatePlanStructure(plan);
    const duration = this.estimatePlanDuration(plan);
    const dependencies = this.validatePlanDependencies(plan);

    return {
      id: plan.id,
      blueprintId: plan.blueprintId,
      name: plan.name,
      stepCount: plan.steps?.length || 0,
      executionOrder: plan.executionOrder || [],
      estimatedDuration: duration.estimatedDuration,
      parallelizable: duration.parallelizable,
      valid: validation.valid && dependencies.valid,
      errors: [...validation.errors, ...dependencies.errors],
      warnings: [...validation.warnings, ...dependencies.warnings],
      createdAt: plan.createdAt,
    };
  }
}

export default SystemPlanner;
export { SystemPlanner };