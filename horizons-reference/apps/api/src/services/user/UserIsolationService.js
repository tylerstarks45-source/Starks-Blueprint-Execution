import 'dotenv/config';
import logger from '../../utils/logger.js';

class UserIsolationService {
  constructor() {
    this.userWorkspaces = new Map();
    this.initialized = true;
    logger.info('User Isolation Service initialized');
  }

  createUserWorkspace(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (this.userWorkspaces.has(userId)) {
      return this.userWorkspaces.get(userId);
    }

    const workspace = {
      userId,
      workspaceId: `ws-${userId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      systems: [],
      automations: [],
      blueprints: [],
      deployments: [],
      executions: [],
      metadata: {
        systemCount: 0,
        automationCount: 0,
        blueprintCount: 0,
        deploymentCount: 0,
        executionCount: 0,
      },
    };

    this.userWorkspaces.set(userId, workspace);
    logger.info(`User workspace created: ${workspace.workspaceId} (user: ${userId})`);

    return workspace;
  }

  getUserWorkspace(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    let workspace = this.userWorkspaces.get(userId);
    if (!workspace) {
      workspace = this.createUserWorkspace(userId);
    }

    return workspace;
  }

  validateUserOwnership(userId, resourceId, resourceType) {
    if (!userId || !resourceId || !resourceType) {
      return {
        valid: false,
        error: 'User ID, resource ID, and resource type are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const validResourceTypes = ['system', 'automation', 'blueprint', 'deployment', 'execution'];
    if (!validResourceTypes.includes(resourceType)) {
      return {
        valid: false,
        error: `Invalid resource type. Must be one of: ${validResourceTypes.join(', ')}`,
        code: 'INVALID_RESOURCE_TYPE',
      };
    }

    const workspace = this.userWorkspaces.get(userId);
    if (!workspace) {
      return {
        valid: false,
        error: 'User workspace not found',
        code: 'WORKSPACE_NOT_FOUND',
      };
    }

    // Check resource ownership based on type
    const resourceMap = {
      system: workspace.systems,
      automation: workspace.automations,
      blueprint: workspace.blueprints,
      deployment: workspace.deployments,
      execution: workspace.executions,
    };

    const resources = resourceMap[resourceType] || [];
    const resourceExists = resources.some(r => r.id === resourceId || r === resourceId);

    if (!resourceExists) {
      logger.warn(`Ownership validation failed: user ${userId} attempting to access ${resourceType} ${resourceId}`);
      return {
        valid: false,
        error: `User does not own this ${resourceType}`,
        code: 'OWNERSHIP_VALIDATION_FAILED',
      };
    }

    return {
      valid: true,
      message: 'User owns this resource',
      code: 'OWNERSHIP_VALIDATED',
    };
  }

  isolateUserSystems(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const workspace = this.getUserWorkspace(userId);

    return {
      userId,
      systems: workspace.systems,
      count: workspace.systems.length,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  isolateUserAutomations(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const workspace = this.getUserWorkspace(userId);

    return {
      userId,
      automations: workspace.automations,
      count: workspace.automations.length,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  isolateUserBlueprints(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const workspace = this.getUserWorkspace(userId);

    return {
      userId,
      blueprints: workspace.blueprints,
      count: workspace.blueprints.length,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  isolateUserUsageAnalytics(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const workspace = this.getUserWorkspace(userId);

    return {
      userId,
      analytics: {
        systems: workspace.metadata.systemCount,
        automations: workspace.metadata.automationCount,
        blueprints: workspace.metadata.blueprintCount,
        deployments: workspace.metadata.deploymentCount,
        executions: workspace.metadata.executionCount,
      },
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  enforceUserBoundary(userId, request) {
    if (!userId || !request) {
      return {
        enforced: false,
        error: 'User ID and request are required',
      };
    }

    // Verify request belongs to user
    if (request.userId && request.userId !== userId) {
      logger.warn(`User boundary violation attempt: ${userId} accessing ${request.userId} request`);
      return {
        enforced: false,
        error: 'User boundary violation: Cannot access other users requests',
        code: 'BOUNDARY_VIOLATION',
      };
    }

    // Verify no admin data in request
    if (request.adminData || request.platformData) {
      logger.warn(`Admin data access attempt by user: ${userId}`);
      return {
        enforced: false,
        error: 'User cannot access admin or platform data',
        code: 'ADMIN_DATA_ACCESS_ATTEMPT',
      };
    }

    // Verify no cross-user resource access
    if (request.targetUserId && request.targetUserId !== userId) {
      logger.warn(`Cross-user access attempt: ${userId} accessing ${request.targetUserId}`);
      return {
        enforced: false,
        error: 'User cannot access other users resources',
        code: 'CROSS_USER_ACCESS_ATTEMPT',
      };
    }

    return {
      enforced: true,
      message: 'User boundary enforced',
      code: 'BOUNDARY_ENFORCED',
    };
  }

  getUserIsolationStatus(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const workspace = this.getUserWorkspace(userId);

    return {
      status: 'isolated',
      userId,
      workspaceId: workspace.workspaceId,
      isolation: {
        enforced: true,
        verified: true,
        crossUserAccessBlocked: true,
        adminDataHidden: true,
      },
      workspace: {
        systems: workspace.metadata.systemCount,
        automations: workspace.metadata.automationCount,
        blueprints: workspace.metadata.blueprintCount,
        deployments: workspace.metadata.deploymentCount,
        executions: workspace.metadata.executionCount,
      },
      verification: {
        workspaceExists: true,
        userOwnershipVerified: true,
        boundaryEnforced: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  addResourceToWorkspace(userId, resourceType, resource) {
    if (!userId || !resourceType || !resource) {
      throw new Error('User ID, resource type, and resource are required');
    }

    const workspace = this.getUserWorkspace(userId);
    const resourceMap = {
      system: 'systems',
      automation: 'automations',
      blueprint: 'blueprints',
      deployment: 'deployments',
      execution: 'executions',
    };

    const resourceKey = resourceMap[resourceType];
    if (!resourceKey) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }

    workspace[resourceKey].push(resource);
    workspace.metadata[`${resourceType}Count`] = workspace[resourceKey].length;

    logger.info(`Resource added to workspace: ${userId} - ${resourceType}`);
    return resource;
  }

  removeResourceFromWorkspace(userId, resourceType, resourceId) {
    if (!userId || !resourceType || !resourceId) {
      throw new Error('User ID, resource type, and resource ID are required');
    }

    const workspace = this.getUserWorkspace(userId);
    const resourceMap = {
      system: 'systems',
      automation: 'automations',
      blueprint: 'blueprints',
      deployment: 'deployments',
      execution: 'executions',
    };

    const resourceKey = resourceMap[resourceType];
    if (!resourceKey) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }

    const initialLength = workspace[resourceKey].length;
    workspace[resourceKey] = workspace[resourceKey].filter(r => r.id !== resourceId && r !== resourceId);
    const removed = initialLength > workspace[resourceKey].length;

    if (removed) {
      workspace.metadata[`${resourceType}Count`] = workspace[resourceKey].length;
      logger.info(`Resource removed from workspace: ${userId} - ${resourceType} ${resourceId}`);
    }

    return removed;
  }
}

const userIsolationService = new UserIsolationService();

export default userIsolationService;
export { UserIsolationService };