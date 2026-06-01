import enhancedUserIsolationService from '../services/user/EnhancedUserIsolationService.js';
import logger from '../utils/logger.js';

function enforceUserIsolation() {
  return (req, res, next) => {
    // Extract userId from session (set by roleBasedAuth middleware)
    const sessionUserId = req.userId;

    if (!sessionUserId) {
      logger.warn('User isolation enforcement: no session user ID found');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_USER_ID',
      });
    }

    // Check for userId in request params
    const paramUserId = req.params.userId;
    if (paramUserId && paramUserId !== sessionUserId) {
      logger.warn(`User isolation violation: ${sessionUserId} attempted to access ${paramUserId}`);
      return res.status(403).json({
        error: 'User isolation violation: Cannot access other users resources',
        code: 'ISOLATION_VIOLATION',
      });
    }

    // Check for userId in request body
    const bodyUserId = req.body?.userId;
    if (bodyUserId && bodyUserId !== sessionUserId) {
      logger.warn(`User isolation violation: ${sessionUserId} attempted to access ${bodyUserId}`);
      return res.status(403).json({
        error: 'User isolation violation: Cannot access other users resources',
        code: 'ISOLATION_VIOLATION',
      });
    }

    // Attach isolated userId to request
    req.isolatedUserId = sessionUserId;

    next();
  };
}

function validateUserOwnership(resourceType) {
  if (!resourceType || typeof resourceType !== 'string') {
    throw new Error('Resource type is required');
  }

  return (req, res, next) => {
    const sessionUserId = req.userId;
    const resourceId = req.params.id || req.params.resourceId;

    if (!sessionUserId) {
      logger.warn('User ownership validation: no session user ID found');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_USER_ID',
      });
    }

    if (!resourceId) {
      return res.status(400).json({
        error: 'Resource ID is required',
        code: 'MISSING_RESOURCE_ID',
      });
    }

    // Validate ownership
    const validation = enhancedUserIsolationService.validateUserOwnership(
      sessionUserId,
      resourceId,
      resourceType
    );

    if (!validation.valid) {
      logger.warn(`User ownership validation failed: ${sessionUserId} does not own ${resourceType} ${resourceId}`);
      return res.status(403).json({
        error: validation.error,
        code: validation.code,
      });
    }

    // Attach resource info to request
    req.resourceId = resourceId;
    req.resourceType = resourceType;

    next();
  };
}

function preventCrossUserAccess() {
  return (req, res, next) => {
    const sessionUserId = req.userId;
    const targetUserId = req.params.userId || req.body?.userId || req.query?.userId;

    if (!sessionUserId) {
      logger.warn('Cross-user access prevention: no session user ID found');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_USER_ID',
      });
    }

    if (targetUserId && targetUserId !== sessionUserId) {
      logger.error(`Cross-user access attempt: ${sessionUserId} attempted to access ${targetUserId}`);
      logIsolationViolation(sessionUserId, targetUserId, 'cross-user-access-attempt');
      return res.status(403).json({
        error: 'Cross-user access violation: Cannot access other users resources',
        code: 'CROSS_USER_ACCESS_VIOLATION',
      });
    }

    next();
  };
}

function logIsolationViolation(userId, targetUserId, resource) {
  if (!userId || !targetUserId || !resource) {
    logger.warn('Invalid isolation violation log parameters');
    return null;
  }

  const logEntry = {
    userId,
    targetUserId,
    resource,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`Isolation violation: ${userId} attempted to access ${targetUserId} - ${resource}`);
  return logEntry;
}

export {
  enforceUserIsolation,
  validateUserOwnership,
  preventCrossUserAccess,
  logIsolationViolation,
};