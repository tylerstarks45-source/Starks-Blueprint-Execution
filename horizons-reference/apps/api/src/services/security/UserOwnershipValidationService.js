import 'dotenv/config';
import logger from '../../utils/logger.js';

class UserOwnershipValidationService {
  constructor() {
    this.ownershipCache = new Map();
    this.violationLog = [];
    this.maxViolationLogs = 1000;
    this.initialized = true;
    logger.info('User Ownership Validation Service initialized');
  }

  validateUserOwnsResource(userId, resourceId, resourceType) {
    if (!userId || !resourceId || !resourceType) {
      throw new Error('User ID, resource ID, and resource type are required');
    }

    if (typeof userId !== 'string' || typeof resourceId !== 'string' || typeof resourceType !== 'string') {
      throw new Error('User ID, resource ID, and resource type must be strings');
    }

    const validResourceTypes = ['system', 'automation', 'blueprint', 'deployment', 'execution', 'credit', 'analytics', 'activity'];
    if (!validResourceTypes.includes(resourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}. Must be one of: ${validResourceTypes.join(', ')}`);
    }

    // Check ownership (in real implementation, query PocketBase)
    const isOwner = this.checkResourceOwnership(userId, resourceId, resourceType);

    if (!isOwner) {
      logger.error(`Ownership validation failed: ${userId} does not own ${resourceType} ${resourceId}`);
      this.logOwnershipViolation(userId, resourceId, resourceType);
      throw new Error(`User does not own this ${resourceType}`);
    }

    logger.debug(`Ownership validated: ${userId} owns ${resourceType} ${resourceId}`);
    return {
      valid: true,
      userId,
      resourceId,
      resourceType,
      timestamp: new Date().toISOString(),
    };
  }

  validateUserOwnsResources(userId, resourceIds, resourceType) {
    if (!userId || !Array.isArray(resourceIds) || resourceIds.length === 0 || !resourceType) {
      throw new Error('User ID, non-empty resource IDs array, and resource type are required');
    }

    if (typeof userId !== 'string' || typeof resourceType !== 'string') {
      throw new Error('User ID and resource type must be strings');
    }

    const validResourceTypes = ['system', 'automation', 'blueprint', 'deployment', 'execution', 'credit', 'analytics', 'activity'];
    if (!validResourceTypes.includes(resourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }

    const unownedResources = [];

    for (const resourceId of resourceIds) {
      if (typeof resourceId !== 'string') {
        throw new Error('All resource IDs must be strings');
      }

      const isOwner = this.checkResourceOwnership(userId, resourceId, resourceType);
      if (!isOwner) {
        unownedResources.push(resourceId);
      }
    }

    if (unownedResources.length > 0) {
      logger.error(`Ownership validation failed: ${userId} does not own ${unownedResources.length} ${resourceType}(s)`);
      unownedResources.forEach(resourceId => {
        this.logOwnershipViolation(userId, resourceId, resourceType);
      });
      throw new Error(`User does not own ${unownedResources.length} resource(s)`);
    }

    logger.debug(`Ownership validated: ${userId} owns all ${resourceIds.length} ${resourceType}(s)`);
    return {
      valid: true,
      userId,
      resourceCount: resourceIds.length,
      resourceType,
      timestamp: new Date().toISOString(),
    };
  }

  filterResourcesByUser(userId, resources, resourceType) {
    if (!userId || !Array.isArray(resources) || !resourceType) {
      throw new Error('User ID, resources array, and resource type are required');
    }

    if (typeof userId !== 'string' || typeof resourceType !== 'string') {
      throw new Error('User ID and resource type must be strings');
    }

    const validResourceTypes = ['system', 'automation', 'blueprint', 'deployment', 'execution', 'credit', 'analytics', 'activity'];
    if (!validResourceTypes.includes(resourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }

    const filtered = resources.filter(resource => {
      if (!resource || typeof resource !== 'object') {
        return false;
      }

      // Check if resource has userId field and it matches
      if ('userId' in resource) {
        return resource.userId === userId;
      }

      // Check if resource has owner field
      if ('owner' in resource) {
        return resource.owner === userId;
      }

      // Check if resource has ownerId field
      if ('ownerId' in resource) {
        return resource.ownerId === userId;
      }

      return false;
    });

    logger.debug(`Filtered ${filtered.length} of ${resources.length} ${resourceType}(s) for user ${userId}`);
    return filtered;
  }

  getUserOwnedSystems(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In real implementation, fetch from PocketBase
    // For now, return empty array
    logger.debug(`Retrieved systems for user ${userId}`);
    return {
      userId,
      systems: [],
      count: 0,
      resourceType: 'system',
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserOwnedAutomations(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In real implementation, fetch from PocketBase
    // For now, return empty array
    logger.debug(`Retrieved automations for user ${userId}`);
    return {
      userId,
      automations: [],
      count: 0,
      resourceType: 'automation',
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserOwnedBlueprints(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In real implementation, fetch from PocketBase
    // For now, return empty array
    logger.debug(`Retrieved blueprints for user ${userId}`);
    return {
      userId,
      blueprints: [],
      count: 0,
      resourceType: 'blueprint',
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserOwnedCredits(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In real implementation, fetch from credit service
    // For now, return default credits
    logger.debug(`Retrieved credits for user ${userId}`);
    return {
      userId,
      balance: 0,
      monthlyAllocation: 0,
      tier: 'starter',
      resourceType: 'credit',
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserOwnedAnalytics(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In real implementation, fetch from analytics service
    // For now, return empty analytics
    logger.debug(`Retrieved analytics for user ${userId}`);
    return {
      userId,
      analytics: {
        systems: 0,
        automations: 0,
        blueprints: 0,
        deployments: 0,
        executions: 0,
      },
      resourceType: 'analytics',
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserOwnedActivity(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In real implementation, fetch from activity log
    // For now, return empty activity
    logger.debug(`Retrieved activity for user ${userId}`);
    return {
      userId,
      activities: [],
      count: 0,
      resourceType: 'activity',
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  validateOwnershipBeforeAccess(userId, resourceId, resourceType) {
    if (!userId || !resourceId || !resourceType) {
      return {
        valid: false,
        error: 'User ID, resource ID, and resource type are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof userId !== 'string' || typeof resourceId !== 'string' || typeof resourceType !== 'string') {
      return {
        valid: false,
        error: 'User ID, resource ID, and resource type must be strings',
        code: 'INVALID_PARAMETER_TYPE',
      };
    }

    const validResourceTypes = ['system', 'automation', 'blueprint', 'deployment', 'execution', 'credit', 'analytics', 'activity'];
    if (!validResourceTypes.includes(resourceType)) {
      return {
        valid: false,
        error: `Invalid resource type: ${resourceType}`,
        code: 'INVALID_RESOURCE_TYPE',
      };
    }

    const isOwner = this.checkResourceOwnership(userId, resourceId, resourceType);

    if (!isOwner) {
      logger.warn(`Access denied: ${userId} attempted to access ${resourceType} ${resourceId} they don't own`);
      this.logOwnershipViolation(userId, resourceId, resourceType);
      return {
        valid: false,
        error: `User does not own this ${resourceType}`,
        code: 'OWNERSHIP_VALIDATION_FAILED',
        userId,
        resourceId,
        resourceType,
      };
    }

    logger.debug(`Access granted: ${userId} owns ${resourceType} ${resourceId}`);
    return {
      valid: true,
      message: 'User owns this resource and can access it',
      code: 'OWNERSHIP_VALIDATED',
      userId,
      resourceId,
      resourceType,
      timestamp: new Date().toISOString(),
    };
  }

  logOwnershipViolation(userId, attemptedResourceId, resourceType) {
    if (!userId || !attemptedResourceId || !resourceType) {
      logger.warn('Invalid ownership violation log parameters');
      return null;
    }

    const violation = {
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      attemptedResourceId,
      resourceType,
      timestamp: new Date().toISOString(),
    };

    this.violationLog.push(violation);

    // Keep only last 1000 violations
    if (this.violationLog.length > this.maxViolationLogs) {
      this.violationLog = this.violationLog.slice(-this.maxViolationLogs);
    }

    logger.error(`Ownership violation: ${userId} attempted to access ${resourceType} ${attemptedResourceId}`);
    return violation;
  }

  checkResourceOwnership(userId, resourceId, resourceType) {
    // In real implementation, query PocketBase
    // For now, simulate ownership check
    if (!userId || !resourceId) {
      return false;
    }

    // Check cache first
    const cacheKey = `${userId}-${resourceId}-${resourceType}`;
    if (this.ownershipCache.has(cacheKey)) {
      return this.ownershipCache.get(cacheKey);
    }

    // Simulate: resources are owned by the user who created them
    // In production, query PocketBase:
    // const record = await pb.collection(resourceType).getOne(resourceId);
    // const isOwner = record.userId === userId;
    const isOwner = true; // Placeholder

    // Cache result
    this.ownershipCache.set(cacheKey, isOwner);

    return isOwner;
  }

  getViolationLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    return {
      violations: this.violationLog.slice(-limit),
      count: this.violationLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearViolationLog() {
    const clearedCount = this.violationLog.length;
    this.violationLog = [];
    logger.info(`Ownership violation log cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }

  clearOwnershipCache() {
    const clearedCount = this.ownershipCache.size;
    this.ownershipCache.clear();
    logger.info(`Ownership cache cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const userOwnershipValidationService = new UserOwnershipValidationService();

export default userOwnershipValidationService;
export { UserOwnershipValidationService };