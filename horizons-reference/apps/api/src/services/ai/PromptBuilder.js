import logger from '../../utils/logger.js';

class PromptBuilder {
  constructor() {
    this.systemRoles = this.initializeSystemRoles();
    this.taskTemplates = this.initializeTaskTemplates();
  }

  initializeSystemRoles() {
    return {
      'assistant': 'You are a helpful AI assistant.',
      'expert': 'You are an expert in your field.',
      'analyst': 'You are an analytical expert providing thorough insights.',
      'developer': 'You are an expert programmer writing clean, efficient code.',
      'writer': 'You are a skilled writer creating high-quality content.',
      'teacher': 'You are an experienced teacher explaining concepts clearly.',
      'researcher': 'You are a research expert conducting thorough analysis.',
    };
  }

  initializeTaskTemplates() {
    return {
      'text-generation': {
        systemPrompt: 'You are a helpful AI assistant that generates high-quality text content.',
        structure: 'Generate content based on the user request.',
      },
      'code-generation': {
        systemPrompt: 'You are an expert programmer. Generate clean, well-documented, and efficient code.',
        structure: 'Generate code that solves the following problem.',
      },
      'analysis': {
        systemPrompt: 'You are an analytical expert. Provide thorough analysis and insights.',
        structure: 'Analyze the following content and provide detailed insights.',
      },
      'summarization': {
        systemPrompt: 'You are a summarization expert. Create concise and accurate summaries.',
        structure: 'Summarize the following content in a clear and concise manner.',
      },
      'data-analysis': {
        systemPrompt: 'You are a data analysis expert. Provide insights from data.',
        structure: 'Analyze the provided data and extract meaningful insights.',
      },
      'translation': {
        systemPrompt: 'You are a translation expert. Provide accurate translations.',
        structure: 'Translate the following content.',
      },
    };
  }

  buildSystemPrompt(role, context = {}) {
    if (!role) {
      throw new Error('Role is required');
    }

    let systemPrompt = this.systemRoles[role] || role;

    if (context && typeof context === 'object' && Object.keys(context).length > 0) {
      const contextStr = this.formatContext(context);
      systemPrompt = `${systemPrompt}\n\n${contextStr}`;
    }

    return systemPrompt;
  }

  buildUserPrompt(template, variables = {}) {
    if (!template) {
      throw new Error('Template is required');
    }

    if (typeof template !== 'string') {
      throw new Error('Template must be a string');
    }

    return this.replaceTemplateVariables(template, variables);
  }

  buildContextPrompt(context) {
    if (!context || typeof context !== 'object') {
      throw new Error('Context must be a non-empty object');
    }

    const sections = [];

    if (context.background) {
      sections.push(`Background: ${context.background}`);
    }

    if (context.constraints) {
      sections.push(`Constraints: ${context.constraints}`);
    }

    if (context.requirements) {
      sections.push(`Requirements: ${context.requirements}`);
    }

    if (context.examples) {
      sections.push(`Examples: ${context.examples}`);
    }

    if (context.format) {
      sections.push(`Format: ${context.format}`);
    }

    if (context.tone) {
      sections.push(`Tone: ${context.tone}`);
    }

    if (sections.length === 0) {
      throw new Error('Context must contain at least one property');
    }

    return sections.join('\n\n');
  }

  buildTaskPrompt(taskType, requirements = {}) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const template = this.taskTemplates[taskType];
    if (!template) {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    let prompt = template.structure;

    if (requirements && typeof requirements === 'object' && Object.keys(requirements).length > 0) {
      const reqStr = this.formatRequirements(requirements);
      prompt = `${prompt}\n\n${reqStr}`;
    }

    return {
      systemPrompt: template.systemPrompt,
      userPrompt: prompt,
      taskType,
    };
  }

  injectContext(prompt, contextData) {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    if (!contextData || typeof contextData !== 'object' || Object.keys(contextData).length === 0) {
      return prompt;
    }

    const contextStr = this.buildContextPrompt(contextData);
    return `${contextStr}\n\n${prompt}`;
  }

  validatePrompt(prompt) {
    if (!prompt) {
      return { valid: false, error: 'Prompt cannot be empty' };
    }

    if (typeof prompt !== 'string') {
      return { valid: false, error: 'Prompt must be a string' };
    }

    if (prompt.trim().length === 0) {
      return { valid: false, error: 'Prompt cannot be only whitespace' };
    }

    if (prompt.length > 100000) {
      return { valid: false, error: 'Prompt exceeds maximum length of 100,000 characters' };
    }

    return { valid: true };
  }

  replaceTemplateVariables(prompt, variables = {}) {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    let result = prompt;
    const unreplacedVars = [];

    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(pattern, String(value));
    });

    const matches = result.match(/{\{\s*\w+\s*\}\}/g) || [];
    if (matches.length > 0) {
      const uniqueMatches = [...new Set(matches)];
      logger.warn(`Unreplaced template variables found: ${uniqueMatches.join(', ')}`);
      unreplacedVars.push(...uniqueMatches);
    }

    return {
      prompt: result,
      unreplacedVariables: unreplacedVars,
    };
  }

  addSystemRole(roleId, rolePrompt) {
    if (!roleId || !rolePrompt) {
      throw new Error('Role ID and prompt are required');
    }

    this.systemRoles[roleId] = rolePrompt;
    logger.info(`System role added: ${roleId}`);
    return rolePrompt;
  }

  addTaskTemplate(taskType, template) {
    if (!taskType || !template || !template.systemPrompt) {
      throw new Error('Task type and template with systemPrompt are required');
    }

    this.taskTemplates[taskType] = {
      systemPrompt: template.systemPrompt,
      structure: template.structure || '',
    };
    logger.info(`Task template added: ${taskType}`);
    return template;
  }

  getTaskTemplate(taskType) {
    return this.taskTemplates[taskType] || null;
  }

  listTaskTemplates() {
    return Object.keys(this.taskTemplates);
  }

  listSystemRoles() {
    return Object.keys(this.systemRoles);
  }

  formatContext(context) {
    const parts = [];
    Object.entries(context).forEach(([key, value]) => {
      if (value) {
        parts.push(`${key}: ${value}`);
      }
    });
    return parts.join('\n');
  }

  formatRequirements(requirements) {
    const parts = [];
    Object.entries(requirements).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          parts.push(`${key}: ${value.join(', ')}`);
        } else {
          parts.push(`${key}: ${value}`);
        }
      }
    });
    return parts.join('\n');
  }
}

export default PromptBuilder;
export { PromptBuilder };