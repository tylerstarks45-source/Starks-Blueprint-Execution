import 'dotenv/config';
import logger from '../../utils/logger.js';

class ResourceFilteringService {
  constructor() {
    this.sensitiveFieldPatterns = [
      'password',
      'apikey',
      'api_key',
      'secret',
      'token',
      'auth',
      'credential',
      'admindata',
      'admin_data',
      'platformdata',
      'platform_data',
      'internaldata',
      'internal_data',
      'systemconfig',
      'system_config',
      'privatekey',
      'private_key',
      'accesstoken',
      'access_token',
      'refreshtoken',
      'refresh_token',
    ];
    this.initialized = true;
    logger.info('Resource Filtering Service initialized');
  }

  filterSystemsByUser(userId, systems) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!Array.isArray(systems)) {
      throw new Error('Systems must be an array');
    }

    const filtered = systems.filter(system => {
      if (!system || typeof system !== 'object') {
        return false;
      }

      // Check if system belongs to user
      const systemUserId = system.userId || system.owner || system.ownerId;
      if (systemUserId && systemUserId !== userId) {
        logger.warn(`Filtering out system ${system.id} - belongs to ${systemUserId}, not ${userId}`);
        return false;
      }

      return true;
    });

    logger.debug(`Filtered ${filtered.length} of ${systems.length} systems for user ${userId}`);
    return filtered;
  }

  filterAutomationsByUser(userId, automations) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!Array.isArray(automations)) {
      throw new Error('Automations must be an array');
    }

    const filtered = automations.filter(automation => {
      if (!automation || typeof automation !== 'object') {
        return false;
      }

      // Check if automation belongs to user
      const automationUserId = automation.userId || automation.owner || automation.ownerId;
      if (automationUserId && automationUserId !== userId) {
        logger.warn(`Filtering out automation ${automation.id} - belongs to ${automationUserId}, not ${userId}`);
        return false;
      }

      return true;
    });

    logger.debug(`Filtered ${filtered.length} of ${automations.length} automations for user ${userId}`);
    return filtered;
  }

  filterBlueprintsByUser(userId, blueprints) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!Array.isArray(blueprints)) {
      throw new Error('Blueprints must be an array');
    }

    const filtered = blueprints.filter(blueprint => {
      if (!blueprint || typeof blueprint !== 'object') {
        return false;
      }

      // Check if blueprint belongs to user
      const blueprintUserId = blueprint.userId || blueprint.owner || blueprint.ownerId;
      if (blueprintUserId && blueprintUserId !== userId) {
        logger.warn(`Filtering out blueprint ${blueprint.id} - belongs to ${blueprintUserId}, not ${userId}`);
        return false;
      }

      return true;
    });

    logger.debug(`Filtered ${filtered.length} of ${blueprints.length} blueprints for user ${userId}`);
    return filtered;
  }

  filterActivityByUser(userId, activity) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!Array.isArray(activity)) {
      throw new Error('Activity must be an array');
    }

    const filtered = activity.filter(record => {
      if (!record || typeof record !== 'object') {
        return false;
      }

      // Check if activity belongs to user
      const recordUserId = record.userId || record.user || record.performedBy;
      if (recordUserId && recordUserId !== userId) {
        logger.warn(`Filtering out activity record - belongs to ${recordUserId}, not ${userId}`);
        return false;
      }

      return true;
    });

    logger.debug(`Filtered ${filtered.length} of ${activity.length} activity records for user ${userId}`);
    return filtered;
  }

  filterAnalyticsByUser(userId, analytics) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!analytics || typeof analytics !== 'object') {
      throw new Error('Analytics must be an object');
    }

    // Ensure analytics only contains user's data
    const filtered = {
      userId,
      ...analytics,
    };

    // Remove any platform-wide analytics
    const platformFields = ['platformStats', 'globalMetrics', 'systemWideAnalytics', 'allUsersData'];
    platformFields.forEach(field => {
      if (field in filtered) {
        logger.warn(`Removing platform field from analytics: ${field}`);
        delete filtered[field];
      }
    });

    logger.debug(`Filtered analytics for user ${userId}`);
    return filtered;
  }

  removeSensitiveFields(resource, resourceType) {
    if (!resource || typeof resource !== 'object') {
      throw new Error('Resource must be a valid object');
    }

    if (!resourceType || typeof resourceType !== 'string') {
      throw new Error('Resource type is required and must be a string');
    }

    const cleaned = { ...resource };
    const removedFields = [];

    // Remove sensitive fields
    Object.keys(cleaned).forEach(key => {
      const keyLower = key.toLowerCase();

      // Check if field matches sensitive patterns
      const isSensitive = this.sensitiveFieldPatterns.some(pattern => keyLower.includes(pattern));

      if (isSensitive) {
        logger.debug(`Removing sensitive field from ${resourceType}: ${key}`);
        delete cleaned[key];
        removedFields.push(key);
      }
    });

    if (removedFields.length > 0) {
      logger.info(`Removed ${removedFields.length} sensitive field(s) from ${resourceType}: ${removedFields.join(', ')}`);
    }

    return cleaned;
  }

  validateFilteredData(userId, data, resourceType) {
    if (!userId || !data || !resourceType) {
      return {
        valid: false,
        error: 'User ID, data, and resource type are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof userId !== 'string' || typeof resourceType !== 'string') {
      return {
        valid: false,
        error: 'User ID and resource type must be strings',
        code: 'INVALID_PARAMETER_TYPE',
      };
    }

    // Validate data is array or object
    if (!Array.isArray(data) && typeof data !== 'object') {
      return {
        valid: false,
        error: 'Data must be an array or object',
        code: 'INVALID_DATA_TYPE',
      };
    }

    const dataArray = Array.isArray(data) ? data : [data];
    const crossUserRecords = [];
    const sensitiveFieldsFound = [];

    // Check for cross-user records
    dataArray.forEach((record, index) => {
      if (!record || typeof record !== 'object') {
        return;
      }

      // Check userId field
      const recordUserId = record.userId || record.owner || record.ownerId || record.user;
      if (recordUserId && recordUserId !== userId) {
        logger.warn(`Cross-user record detected at index ${index}: belongs to ${recordUserId}`);
        crossUserRecords.push({
          index,
          recordUserId,
          expectedUserId: userId,
        });
      }

      // Check for sensitive fields
      Object.keys(record).forEach(key => {
        const keyLower = key.toLowerCase();
        const isSensitive = this.sensitiveFieldPatterns.some(pattern => keyLower.includes(pattern));

        if (isSensitive) {
          logger.warn(`Sensitive field detected in ${resourceType} at index ${index}: ${key}`);
          sensitiveFieldsFound.push({
            index,
            field: key,
          });
        }
      });
    });

    if (crossUserRecords.length > 0) {
      return {
        valid: false,
        error: `Data contains ${crossUserRecords.length} cross-user record(s)`,
        code: 'CROSS_USER_DATA_DETECTED',
        crossUserRecords,
      };
    }

    if (sensitiveFieldsFound.length > 0) {
      return {
        valid: false,
        error: `Data contains ${sensitiveFieldsFound.length} sensitive field(s)`,
        code: 'SENSITIVE_FIELDS_DETECTED',
        sensitiveFieldsFound,
      };
    }

    logger.debug(`Filtered data validation passed for user ${userId}`);
    return {
      valid: true,
      message: 'Data is properly filtered and contains no sensitive information',
      code: 'DATA_VALIDATION_PASSED',
      userId,
      resourceType,
      recordCount: dataArray.length,
      timestamp: new Date().toISOString(),
    };
  }

  isSensitiveField(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
      return false;
    }

    const fieldLower = fieldName.toLowerCase();
    return this.sensitiveFieldPatterns.some(pattern => fieldLower.includes(pattern));
  }

  getSensitiveFieldPatterns() {
    return {
      patterns: this.sensitiveFieldPatterns,
      count: this.sensitiveFieldPatterns.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const resourceFilteringService = new ResourceFilteringService();

export default resourceFilteringService;
export { ResourceFilteringService };