import logger from '../utils/logger.js';

function preventCrossUserAccess() {
  return (req, res, next) => {
    const authenticatedUserId = req.authenticatedUserId || req.user?.id || req.auth?.id;
    const paramUserId = req.params.userId || req.params.id;
    const bodyUserId = req.body?.userId;
    const queryUserId = req.query?.userId;

    if (!authenticatedUserId) {
      logger.warn('Cross-user access prevention: no authenticated user');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTHENTICATION',
      });
    }

    // Check if request attempts to access another user's data
    const targetUserId = paramUserId || bodyUserId || queryUserId;

    if (targetUserId && targetUserId !== authenticatedUserId) {
      logger.error(`Cross-user access attempt: ${authenticatedUserId} tried to access ${targetUserId}`);
      logCrossUserAttempt(authenticatedUserId, targetUserId, req.path);
      return res.status(403).json({
        error: 'Cross-user access violation: Cannot access other users resources',
        code: 'CROSS_USER_ACCESS_BLOCKED',
      });
    }

    logger.debug(`Cross-user access prevention passed for ${authenticatedUserId}`);
    next();
  };
}

function validateUserIdMatch(paramUserId, authenticatedUserId) {
  if (!paramUserId || !authenticatedUserId) {
    throw new Error('Both user IDs are required');
  }

  if (typeof paramUserId !== 'string' || typeof authenticatedUserId !== 'string') {
    throw new Error('User IDs must be strings');
  }

  if (paramUserId !== authenticatedUserId) {
    logger.error(`User ID mismatch: ${authenticatedUserId} does not match ${paramUserId}`);
    throw new Error('User ID mismatch: Cannot access other users resources');
  }

  logger.debug(`User ID match validated: ${authenticatedUserId}`);
  return {
    valid: true,
    userId: authenticatedUserId,
    timestamp: new Date().toISOString(),
  };
}

function blockUnauthorizedAccess(userId, targetUserId, resource) {
  if (!userId || !targetUserId || !resource) {
    throw new Error('User ID, target user ID, and resource are required');
  }

  if (typeof userId !== 'string' || typeof targetUserId !== 'string') {
    throw new Error('User IDs must be strings');
  }

  if (userId !== targetUserId) {
    logger.error(`Unauthorized access blocked: ${userId} attempted to access ${targetUserId} ${resource}`);
    logCrossUserAttempt(userId, targetUserId, resource);
    const error = new Error(`Cannot access other users ${resource}`);
    error.statusCode = 403;
    error.code = 'UNAUTHORIZED_ACCESS';
    throw error;
  }

  logger.debug(`Authorized access granted: ${userId} accessing own ${resource}`);
  return {
    authorized: true,
    userId,
    resource,
    timestamp: new Date().toISOString(),
  };
}

function logCrossUserAttempt(userId, targetUserId, resource) {
  if (!userId || !targetUserId || !resource) {
    logger.warn('Invalid cross-user attempt log parameters');
    return null;
  }

  const attempt = {
    id: `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    targetUserId,
    resource,
    timestamp: new Date().toISOString(),
  };

  logger.error(`Cross-user access attempt logged: ${userId} -> ${targetUserId} (${resource})`);
  return attempt;
}

export {
  preventCrossUserAccess,
  validateUserIdMatch,
  blockUnauthorizedAccess,
  logCrossUserAttempt,
};