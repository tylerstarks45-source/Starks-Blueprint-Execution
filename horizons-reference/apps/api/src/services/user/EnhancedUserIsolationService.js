import 'dotenv/config';
import logger from '../../utils/logger.js';

class EnhancedUserIsolationService {
  constructor() {
    this.userDataCache = new Map();
    this.isolationViolations = [];
    this.maxViolationLogs = 1000;
    this.initialized = true;
    logger.info('Enhanced User Isolation Service initialized');
  }

  enforceUserIsolation(userId, requestUserId) {
    if (!userId || !requestUserId) {
      throw new Error('User ID and request user ID are required');
    }

    if (userId !== requestUserId) {
      logger.error(`User isolation violation: ${userId} attempted to access ${requestUserId} data`);
      this.logIsolationViolation(userId, requestUserId, 'cross-user-access');
      throw new Error('User isolation violation: Cannot access other users data');
    }

    return {
      enforced: true,
      message: 'User isolation enforced',
      code: 'ISOLATION_ENFORCED',
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  validateUserOwnership(userId, resourceId, resourceType) {
    if (!userId || !resourceId || !resourceType) {
      return {
        valid: false,
        error: 'User ID, resource ID, and resource type are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const validResourceTypes = ['system', 'automation', 'blueprint', 'deployment', 'execution', 'credit', 'analytics'];
    if (!validResourceTypes.includes(resourceType)) {
      return {
        valid: false,
        error: `Invalid resource type. Must be one of: ${validResourceTypes.join(', ')}`,
        code: 'INVALID_RESOURCE_TYPE',
      };
    }

    // In a real implementation, this would check against PocketBase
    // For now, we'll simulate ownership validation
    const isOwner = this.checkResourceOwnership(userId, resourceId, resourceType);

    if (!isOwner) {
      logger.warn(`Ownership validation failed: ${userId} does not own ${resourceType} ${resourceId}`);
      this.logIsolationViolation(userId, resourceId, `ownership-violation-${resourceType}`);
      return {
        valid: false,
        error: `User does not own this ${resourceType}`,
        code: 'OWNERSHIP_VALIDATION_FAILED',
        userId,
        resourceId,
        resourceType,
      };
    }

    return {
      valid: true,
      message: 'User owns this resource',
      code: 'OWNERSHIP_VALIDATED',
      userId,
      resourceId,
      resourceType,
      timestamp: new Date().toISOString(),
    };
  }

  isolateUserData(userId, data) {
    if (!userId || !data) {
      throw new Error('User ID and data are required');
    }

    if (typeof data !== 'object') {
      throw new Error('Data must be an object');
    }

    // Filter data to ensure it only contains user's own data
    const isolated = {};

    Object.entries(data).forEach(([key, value]) => {
      // Skip sensitive fields
      if (this.isSensitiveField(key)) {
        return;
      }

      // Validate data ownership if it has userId field
      if (value && typeof value === 'object' && 'userId' in value) {
        if (value.userId !== userId) {
          logger.warn(`Data isolation violation: ${userId} attempted to access data owned by ${value.userId}`);
          this.logIsolationViolation(userId, value.userId, 'data-isolation-violation');
          throw new Error('Data isolation violation: Cannot access other users data');
        }
      }

      isolated[key] = value;
    });

    return {
      userId,
      data: isolated,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserIsolatedSystems(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In a real implementation, fetch from PocketBase
    // For now, return empty array
    return {
      userId,
      systems: [],
      count: 0,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserIsolatedAutomations(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In a real implementation, fetch from PocketBase
    // For now, return empty array
    return {
      userId,
      automations: [],
      count: 0,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserIsolatedBlueprints(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In a real implementation, fetch from PocketBase
    // For now, return empty array
    return {
      userId,
      blueprints: [],
      count: 0,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserIsolatedCredits(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In a real implementation, fetch from credit service
    // For now, return default credits
    return {
      userId,
      balance: 0,
      monthlyAllocation: 0,
      tier: 'starter',
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserIsolatedAnalytics(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In a real implementation, fetch from analytics service
    // For now, return empty analytics
    return {
      userId,
      analytics: {
        systems: 0,
        automations: 0,
        blueprints: 0,
        deployments: 0,
        executions: 0,
      },
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  getUserIsolatedActivity(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // In a real implementation, fetch from activity log
    // For now, return empty activity
    return {
      userId,
      activities: [],
      count: 0,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  validateDataOwnership(userId, data) {
    if (!userId || !data) {
      return {
        valid: false,
        error: 'User ID and data are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof data !== 'object') {
      return {
        valid: false,
        error: 'Data must be an object',
        code: 'INVALID_DATA_TYPE',
      };
    }

    // Check if data has userId field
    if (!('userId' in data)) {
      return {
        valid: false,
        error: 'Data must have userId field',
        code: 'MISSING_USER_ID_FIELD',
      };
    }

    // Verify data belongs to user
    if (data.userId !== userId) {
      logger.warn(`Data ownership validation failed: ${userId} does not own data owned by ${data.userId}`);
      this.logIsolationViolation(userId, data.userId, 'data-ownership-violation');
      return {
        valid: false,
        error: 'User does not own this data',
        code: 'OWNERSHIP_VALIDATION_FAILED',
        userId,
        dataOwnerId: data.userId,
      };
    }

    return {
      valid: true,
      message: 'User owns this data',
      code: 'OWNERSHIP_VALIDATED',
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  preventCrossUserAccess(userId, targetUserId) {
    if (!userId || !targetUserId) {
      throw new Error('User ID and target user ID are required');
    }

    if (userId !== targetUserId) {
      logger.error(`Cross-user access attempt: ${userId} attempted to access ${targetUserId}`);
      this.logIsolationViolation(userId, targetUserId, 'cross-user-access-attempt');
      throw new Error('Cross-user access violation: Cannot access other users resources');
    }

    return {
      prevented: true,
      message: 'Cross-user access prevented',
      code: 'CROSS_USER_ACCESS_PREVENTED',
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  checkResourceOwnership(userId, resourceId, resourceType) {
    // In a real implementation, this would check against PocketBase
    // For now, simulate ownership check
    if (!userId || !resourceId) {
      return false;
    }

    // Simulate: resources are owned by the user who created them
    // In production, query PocketBase: pb.collection(resourceType).getOne(resourceId)
    // and verify record.userId === userId
    return true; // Placeholder
  }

  isSensitiveField(fieldName) {
    const sensitiveFields = [
      'password',
      'apiKey',
      'secret',
      'token',
      'adminData',
      'platformData',
      'internalData',
      'systemConfig',
    ];

    return sensitiveFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()));
  }

  logIsolationViolation(userId, targetUserId, violationType) {
    const violation = {
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      targetUserId,
      violationType,
      timestamp: new Date().toISOString(),
    };

    this.isolationViolations.push(violation);

    // Keep only last 1000 violations
    if (this.isolationViolations.length > this.maxViolationLogs) {
      this.isolationViolations = this.isolationViolations.slice(-this.maxViolationLogs);
    }

    logger.warn(`Isolation violation logged: ${violationType} (${userId} -> ${targetUserId})`);
    return violation;
  }

  getIsolationViolations(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    return {
      violations: this.isolationViolations.slice(-limit),
      count: this.isolationViolations.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearIsolationViolations() {
    const clearedCount = this.isolationViolations.length;
    this.isolationViolations = [];
    logger.info(`Isolation violations cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const enhancedUserIsolationService = new EnhancedUserIsolationService();

export default enhancedUserIsolationService;
export { EnhancedUserIsolationService };