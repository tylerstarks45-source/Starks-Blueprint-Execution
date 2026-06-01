import 'dotenv/config';
import logger from '../../utils/logger.js';

class UserLimitsService {
  constructor() {
    this.userResourceUsage = new Map();
    this.resourceLimits = this.initializeResourceLimits();
    this.initialized = true;
    logger.info('User Limits Service initialized');
  }

  initializeResourceLimits() {
    return {
      starter: {
        'active-workflows': 2,
        'blueprint-builds': 5,
        'automations': 5,
        'storage': 1000000000, // 1GB
        'api-calls': 1000,
      },
      builder: {
        'active-workflows': 5,
        'blueprint-builds': 20,
        'automations': 20,
        'storage': 5000000000, // 5GB
        'api-calls': 5000,
      },
      operator: {
        'active-workflows': 15,
        'blueprint-builds': 100,
        'automations': 100,
        'storage': 50000000000, // 50GB
        'api-calls': 50000,
      },
      empire: {
        'active-workflows': -1, // unlimited
        'blueprint-builds': -1, // unlimited
        'automations': -1, // unlimited
        'storage': 500000000000, // 500GB
        'api-calls': -1, // unlimited
      },
    };
  }

  getUserResourceUsage(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    let usage = this.userResourceUsage.get(userId);
    if (!usage) {
      usage = {
        userId,
        'active-workflows': 0,
        'blueprint-builds': 0,
        'automations': 0,
        'storage': 0,
        'api-calls': 0,
        lastUpdated: new Date().toISOString(),
      };
      this.userResourceUsage.set(userId, usage);
    }

    return usage;
  }

  checkResourceLimit(userId, resourceType) {
    if (!userId || !resourceType) {
      return {
        valid: false,
        error: 'User ID and resource type are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const validResourceTypes = ['active-workflows', 'blueprint-builds', 'automations', 'storage', 'api-calls'];
    if (!validResourceTypes.includes(resourceType)) {
      return {
        valid: false,
        error: `Invalid resource type. Must be one of: ${validResourceTypes.join(', ')}`,
        code: 'INVALID_RESOURCE_TYPE',
      };
    }

    const usage = this.getUserResourceUsage(userId);
    const currentUsage = usage[resourceType] || 0;

    // Get user's tier (default to starter)
    const tier = 'starter'; // In real implementation, get from subscription service
    const limits = this.resourceLimits[tier];
    const limit = limits[resourceType];

    const isUnlimited = limit === -1;
    const withinLimit = isUnlimited || currentUsage < limit;

    return {
      valid: withinLimit,
      resourceType,
      currentUsage,
      limit: isUnlimited ? 'unlimited' : limit,
      isUnlimited,
      code: withinLimit ? 'WITHIN_LIMIT' : 'LIMIT_EXCEEDED',
    };
  }

  getResourceLimitStatus(userId, resourceType) {
    if (!userId || !resourceType) {
      throw new Error('User ID and resource type are required');
    }

    const usage = this.getUserResourceUsage(userId);
    const currentUsage = usage[resourceType] || 0;

    // Get user's tier (default to starter)
    const tier = 'starter'; // In real implementation, get from subscription service
    const limits = this.resourceLimits[tier];
    const limit = limits[resourceType];

    const isUnlimited = limit === -1;
    const percentage = isUnlimited ? 0 : Math.round((currentUsage / limit) * 100);
    const remaining = isUnlimited ? -1 : limit - currentUsage;
    const warning = percentage >= 80;

    return {
      userId,
      resourceType,
      tier,
      currentUsage,
      limit: isUnlimited ? 'unlimited' : limit,
      percentage,
      remaining: isUnlimited ? 'unlimited' : remaining,
      warning,
      warningThreshold: 80,
      timestamp: new Date().toISOString(),
    };
  }

  warnUserOfLimitApproach(userId, resourceType) {
    if (!userId || !resourceType) {
      return {
        warned: false,
        error: 'User ID and resource type are required',
      };
    }

    const status = this.getResourceLimitStatus(userId, resourceType);

    if (!status.warning) {
      return {
        warned: false,
        message: 'Usage is within acceptable limits',
        status,
      };
    }

    logger.warn(`User approaching limit: ${userId} - ${resourceType} (${status.percentage}%)`);

    return {
      warned: true,
      message: `You are approaching your ${resourceType} limit`,
      status,
      recommendation: `Consider upgrading your subscription to increase your ${resourceType} limit`,
      timestamp: new Date().toISOString(),
    };
  }

  handleLimitExhaustion(userId, resourceType) {
    if (!userId || !resourceType) {
      return {
        handled: false,
        error: 'User ID and resource type are required',
      };
    }

    const status = this.getResourceLimitStatus(userId, resourceType);

    if (status.percentage < 100) {
      return {
        handled: false,
        message: 'Limit not exhausted',
        status,
      };
    }

    logger.warn(`User limit exhausted: ${userId} - ${resourceType}`);

    return {
      handled: true,
      message: `You have exhausted your ${resourceType} limit`,
      status,
      action: 'warning',
      recommendation: `Upgrade your subscription to increase your ${resourceType} limit`,
      timestamp: new Date().toISOString(),
    };
  }

  getResourceLimits(tier) {
    if (!tier || typeof tier !== 'string') {
      throw new Error('Tier is required and must be a string');
    }

    const limits = this.resourceLimits[tier];
    if (!limits) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    return {
      tier,
      limits,
      timestamp: new Date().toISOString(),
    };
  }

  trackResourceUsage(userId, resourceType, amount) {
    if (!userId || !resourceType || typeof amount !== 'number') {
      throw new Error('User ID, resource type, and numeric amount are required');
    }

    const usage = this.getUserResourceUsage(userId);
    const currentUsage = usage[resourceType] || 0;
    usage[resourceType] = currentUsage + amount;
    usage.lastUpdated = new Date().toISOString();

    logger.info(`Resource usage tracked: ${userId} - ${resourceType} += ${amount}`);

    return usage;
  }

  getAllResourceLimitStatuses(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const resourceTypes = ['active-workflows', 'blueprint-builds', 'automations', 'storage', 'api-calls'];
    const statuses = {};

    resourceTypes.forEach(resourceType => {
      statuses[resourceType] = this.getResourceLimitStatus(userId, resourceType);
    });

    return {
      userId,
      resources: statuses,
      timestamp: new Date().toISOString(),
    };
  }

  resetUserResourceUsage(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const usage = {
      userId,
      'active-workflows': 0,
      'blueprint-builds': 0,
      'automations': 0,
      'storage': 0,
      'api-calls': 0,
      lastUpdated: new Date().toISOString(),
    };

    this.userResourceUsage.set(userId, usage);
    logger.info(`User resource usage reset: ${userId}`);

    return usage;
  }
}

const userLimitsService = new UserLimitsService();

export default userLimitsService;
export { UserLimitsService };