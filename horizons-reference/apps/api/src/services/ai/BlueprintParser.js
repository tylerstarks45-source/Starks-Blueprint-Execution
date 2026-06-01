import logger from '../../utils/logger.js';

class BlueprintParser {
  constructor() {
    this.supportedVersions = ['1.0', '1.1', '2.0'];
  }

  parseBlueprint(data) {
    if (!data) {
      throw new Error('Blueprint data is required');
    }

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        throw new Error(`Failed to parse blueprint JSON: ${error.message}`);
      }
    }

    if (typeof data !== 'object' || data === null) {
      throw new Error('Blueprint must be a valid object');
    }

    // Validate blueprint structure
    const validation = this.validateBlueprintStructure(data);
    if (!validation.valid) {
      throw new Error(`Invalid blueprint: ${validation.errors.join(', ')}`);
    }

    const parsed = {
      id: data.id || `blueprint-${Date.now()}`,
      version: data.version || '1.0',
      name: data.name || 'Unnamed Blueprint',
      description: data.description || '',
      metadata: data.metadata || {},
      requirements: this.extractRequirements(data),
      workflows: this.extractWorkflows(data),
      prompts: this.extractPrompts(data),
      config: data.config || {},
      createdAt: new Date().toISOString(),
    };

    logger.info(`Blueprint parsed successfully: ${parsed.id}`);
    return parsed;
  }

  extractRequirements(blueprint) {
    const requirements = {
      models: [],
      capabilities: [],
      resources: [],
      constraints: {},
    };

    if (blueprint.requirements) {
      if (Array.isArray(blueprint.requirements.models)) {
        requirements.models = blueprint.requirements.models;
      }

      if (Array.isArray(blueprint.requirements.capabilities)) {
        requirements.capabilities = blueprint.requirements.capabilities;
      }

      if (Array.isArray(blueprint.requirements.resources)) {
        requirements.resources = blueprint.requirements.resources;
      }

      if (typeof blueprint.requirements.constraints === 'object') {
        requirements.constraints = blueprint.requirements.constraints;
      }
    }

    return requirements;
  }

  extractWorkflows(blueprint) {
    const workflows = [];

    if (Array.isArray(blueprint.workflows)) {
      blueprint.workflows.forEach((workflow, index) => {
        const parsed = {
          id: workflow.id || `workflow-${index}`,
          name: workflow.name || `Workflow ${index}`,
          description: workflow.description || '',
          steps: Array.isArray(workflow.steps) ? workflow.steps : [],
          config: workflow.config || {},
          dependencies: Array.isArray(workflow.dependencies) ? workflow.dependencies : [],
        };

        workflows.push(parsed);
      });
    }

    return workflows;
  }

  extractPrompts(blueprint) {
    const prompts = [];

    if (Array.isArray(blueprint.prompts)) {
      blueprint.prompts.forEach((prompt, index) => {
        const parsed = {
          id: prompt.id || `prompt-${index}`,
          name: prompt.name || `Prompt ${index}`,
          type: prompt.type || 'text-generation',
          template: prompt.template || '',
          variables: Array.isArray(prompt.variables) ? prompt.variables : [],
          systemPrompt: prompt.systemPrompt || '',
          config: prompt.config || {},
        };

        prompts.push(parsed);
      });
    }

    return prompts;
  }

  validateBlueprintStructure(blueprint) {
    const errors = [];

    if (!blueprint) {
      return {
        valid: false,
        errors: ['Blueprint is null or undefined'],
      };
    }

    // Check version compatibility
    if (blueprint.version && !this.supportedVersions.includes(blueprint.version)) {
      errors.push(`Unsupported blueprint version: ${blueprint.version}. Supported: ${this.supportedVersions.join(', ')}`);
    }

    // Check required fields
    if (!blueprint.id) {
      errors.push('Blueprint must have an id');
    }

    if (!blueprint.name) {
      errors.push('Blueprint must have a name');
    }

    if (blueprint.description && typeof blueprint.description !== 'string') {
      errors.push('Blueprint description must be a string');
    }

    // Check workflows
    if (!Array.isArray(blueprint.workflows) || blueprint.workflows.length === 0) {
      errors.push('Blueprint must have at least one workflow');
    } else {
      blueprint.workflows.forEach((workflow, index) => {
        if (!workflow.id) {
          errors.push(`Workflow ${index} must have an id`);
        }
        if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
          errors.push(`Workflow ${index} must have at least one step`);
        }
      });
    }

    // Check prompts if present
    if (blueprint.prompts && !Array.isArray(blueprint.prompts)) {
      errors.push('Blueprint prompts must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getBlueprintMetadata(blueprint) {
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

  mergeBlueprintVersions(oldBlueprint, newBlueprint) {
    if (!oldBlueprint || !newBlueprint) {
      throw new Error('Both old and new blueprints are required');
    }

    return {
      ...oldBlueprint,
      ...newBlueprint,
      version: newBlueprint.version || oldBlueprint.version,
      updatedAt: new Date().toISOString(),
      previousVersion: oldBlueprint.version,
    };
  }
}

export default BlueprintParser;
export { BlueprintParser };