import logger from '../utils/logger.js';

class BlueprintAnalyzer {
  constructor() {
    this.analysisCache = new Map();
  }

  analyzeBlueprint(blueprint) {
    if (!blueprint) {
      throw new Error('Blueprint is required');
    }

    const analysis = {
      id: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      blueprintId: blueprint.id,
      timestamp: new Date().toISOString(),
      metadata: this.extractBlueprintMetadata(blueprint),
      format: this.validateBlueprintFormat(blueprint),
      complexity: this.getBlueprintComplexity(blueprint),
      dependencies: this.identifyBlueprintDependencies(blueprint),
      report: this.generateBlueprintReport(blueprint),
    };

    this.analysisCache.set(analysis.id, analysis);
    logger.info(`Blueprint analyzed: ${analysis.id}`);

    return analysis;
  }

  extractBlueprintMetadata(blueprint) {
    if (!blueprint) {
      return null;
    }

    return {
      id: blueprint.id,
      name: blueprint.name,
      version: blueprint.version,
      description: blueprint.description,
      workflowCount: blueprint.workflows?.length || 0,
      promptCount: blueprint.prompts?.length || 0,
      requirementCount: {
        models: blueprint.requirements?.models?.length || 0,
        capabilities: blueprint.requirements?.capabilities?.length || 0,
        resources: blueprint.requirements?.resources?.length || 0,
      },
      createdAt: blueprint.createdAt,
    };
  }

  validateBlueprintFormat(blueprint) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!blueprint) {
      validation.valid = false;
      validation.errors.push('Blueprint is null or undefined');
      return validation;
    }

    // Check required fields
    if (!blueprint.id) {
      validation.errors.push('Blueprint must have an id');
      validation.valid = false;
    }

    if (!blueprint.name) {
      validation.errors.push('Blueprint must have a name');
      validation.valid = false;
    }

    if (!blueprint.version) {
      validation.warnings.push('Blueprint should have a version');
    }

    // Check workflows
    if (!Array.isArray(blueprint.workflows) || blueprint.workflows.length === 0) {
      validation.errors.push('Blueprint must have at least one workflow');
      validation.valid = false;
    } else {
      blueprint.workflows.forEach((workflow, index) => {
        if (!workflow.id) {
          validation.errors.push(`Workflow ${index} must have an id`);
          validation.valid = false;
        }
        if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
          validation.errors.push(`Workflow ${index} must have at least one step`);
          validation.valid = false;
        }
      });
    }

    // Check prompts if present
    if (blueprint.prompts && !Array.isArray(blueprint.prompts)) {
      validation.errors.push('Prompts must be an array');
      validation.valid = false;
    }

    return validation;
  }

  getBlueprintComplexity(blueprint) {
    if (!blueprint) {
      return { level: 'unknown', score: 0 };
    }

    let score = 0;

    // Count workflows
    const workflowCount = blueprint.workflows?.length || 0;
    score += workflowCount * 10;

    // Count total steps
    let totalSteps = 0;
    if (blueprint.workflows) {
      blueprint.workflows.forEach(workflow => {
        totalSteps += workflow.steps?.length || 0;
      });
    }
    score += totalSteps * 5;

    // Count dependencies
    let dependencyCount = 0;
    if (blueprint.workflows) {
      blueprint.workflows.forEach(workflow => {
        if (workflow.steps) {
          workflow.steps.forEach(step => {
            dependencyCount += step.dependencies?.length || 0;
          });
        }
      });
    }
    score += dependencyCount * 8;

    // Count prompts
    const promptCount = blueprint.prompts?.length || 0;
    score += promptCount * 3;

    // Count requirements
    const requirementCount = (blueprint.requirements?.models?.length || 0) +
                            (blueprint.requirements?.capabilities?.length || 0) +
                            (blueprint.requirements?.resources?.length || 0);
    score += requirementCount * 2;

    // Determine complexity level
    let level = 'simple';
    if (score > 100) level = 'complex';
    else if (score > 50) level = 'moderate';

    return {
      level,
      score,
      factors: {
        workflows: workflowCount,
        steps: totalSteps,
        dependencies: dependencyCount,
        prompts: promptCount,
        requirements: requirementCount,
      },
    };
  }

  identifyBlueprintDependencies(blueprint) {
    const dependencies = {
      workflowDependencies: [],
      stepDependencies: [],
      resourceDependencies: [],
      modelDependencies: [],
    };

    if (!blueprint) {
      return dependencies;
    }

    // Workflow dependencies
    if (blueprint.workflows) {
      blueprint.workflows.forEach(workflow => {
        if (workflow.dependencies && workflow.dependencies.length > 0) {
          dependencies.workflowDependencies.push({
            workflowId: workflow.id,
            dependsOn: workflow.dependencies,
          });
        }
      });
    }

    // Step dependencies
    if (blueprint.workflows) {
      blueprint.workflows.forEach(workflow => {
        if (workflow.steps) {
          workflow.steps.forEach(step => {
            if (step.dependencies && step.dependencies.length > 0) {
              dependencies.stepDependencies.push({
                stepId: step.id || 'unnamed',
                workflowId: workflow.id,
                dependsOn: step.dependencies,
              });
            }
          });
        }
      });
    }

    // Resource dependencies
    if (blueprint.requirements?.resources) {
      dependencies.resourceDependencies = blueprint.requirements.resources;
    }

    // Model dependencies
    if (blueprint.requirements?.models) {
      dependencies.modelDependencies = blueprint.requirements.models;
    }

    return dependencies;
  }

  generateBlueprintReport(blueprint) {
    if (!blueprint) {
      return null;
    }

    const metadata = this.extractBlueprintMetadata(blueprint);
    const format = this.validateBlueprintFormat(blueprint);
    const complexity = this.getBlueprintComplexity(blueprint);
    const dependencies = this.identifyBlueprintDependencies(blueprint);

    return {
      summary: {
        blueprintId: blueprint.id,
        blueprintName: blueprint.name,
        isValid: format.valid,
        complexityLevel: complexity.level,
        complexityScore: complexity.score,
      },
      structure: {
        workflowCount: metadata.workflowCount,
        promptCount: metadata.promptCount,
        requirementCount: metadata.requirementCount,
      },
      validation: {
        errors: format.errors,
        warnings: format.warnings,
      },
      dependencies: {
        workflowDependencies: dependencies.workflowDependencies.length,
        stepDependencies: dependencies.stepDependencies.length,
        resourceDependencies: dependencies.resourceDependencies.length,
        modelDependencies: dependencies.modelDependencies.length,
      },
      recommendations: this.generateRecommendations(blueprint, format, complexity),
      generatedAt: new Date().toISOString(),
    };
  }

  generateRecommendations(blueprint, format, complexity) {
    const recommendations = [];

    if (!format.valid) {
      recommendations.push('Fix validation errors before proceeding');
    }

    if (complexity.level === 'complex') {
      recommendations.push('Consider breaking down complex workflows into smaller units');
    }

    if (blueprint.workflows && blueprint.workflows.length > 10) {
      recommendations.push('Large number of workflows may impact performance');
    }

    if (!blueprint.requirements || blueprint.requirements.models?.length === 0) {
      recommendations.push('Consider specifying required models for better optimization');
    }

    if (format.warnings.length > 0) {
      recommendations.push('Address warnings to improve blueprint quality');
    }

    return recommendations;
  }

  getAnalysis(analysisId) {
    if (!analysisId) {
      throw new Error('Analysis ID is required');
    }

    const analysis = this.analysisCache.get(analysisId);
    if (!analysis) {
      throw new Error(`Analysis not found: ${analysisId}`);
    }

    return analysis;
  }

  listAnalyses(limit = 10) {
    const analyses = Array.from(this.analysisCache.values());
    return analyses.slice(-limit);
  }
}

export default BlueprintAnalyzer;
export { BlueprintAnalyzer };