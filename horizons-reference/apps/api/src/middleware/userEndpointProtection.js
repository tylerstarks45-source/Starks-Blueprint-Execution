import logger from '../utils/logger.js';

function requireUserRole() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('User role check: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole !== 'USER') {
      logger.warn(`User role check failed: ${userId} has ${userRole} role`);
      logUnauthorizedUserEndpointAccess(userId, req.path);
      return res.status(403).json({
        error: 'User access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    logger.debug(`User role check passed: ${userId}`);
    next();
  };
}

function validateUserSession() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const sessionRole = req.session?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('User session validation: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole !== 'USER') {
      logger.warn(`User session validation failed: ${userId} has ${userRole} role`);
      return res.status(403).json({
        error: 'User access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Validate role consistency if session role exists
    if (sessionRole && sessionRole !== userRole) {
      logger.error(`User session integrity violation: ${userId} session role ${sessionRole} != user role ${userRole}`);
      return res.status(403).json({
        error: 'Session integrity violation',
        code: 'SESSION_INTEGRITY_FAILED',
      });
    }

    logger.debug(`User session validated: ${userId}`);
    next();
  };
}

function blockAdminAccessToUserEndpoints() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Admin access block: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole === 'SUPER_ADMIN') {
      logger.warn(`Admin access to user endpoint blocked: ${userId} has SUPER_ADMIN role`);
      logUnauthorizedUserEndpointAccess(userId, req.path);
      return res.status(403).json({
        error: 'User endpoint access required',
        code: 'ADMIN_ACCESS_BLOCKED',
      });
    }

    logger.debug(`Admin access block passed: ${userId}`);
    next();
  };
}

function logUnauthorizedUserEndpointAccess(userId, endpoint) {
  if (!userId || !endpoint) {
    logger.warn('Invalid unauthorized user endpoint access log parameters');
    return null;
  }

  const logEntry = {
    userId,
    endpoint,
    timestamp: new Date().toISOString(),
  };

  logger.error(`Unauthorized user endpoint access attempt: ${userId} on ${endpoint}`);
  return logEntry;
}

function validateUserOperation(operation) {
  if (!operation || typeof operation !== 'string') {
    throw new Error('Operation is required and must be a string');
  }

  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('User operation validation: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole !== 'USER') {
      logger.warn(`User operation validation failed: ${userId} has ${userRole} role`);
      return res.status(403).json({
        error: 'User access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Validate operation is allowed for user
    const allowedOperations = ['read', 'write', 'delete', 'create', 'manage'];
    if (!allowedOperations.includes(operation.toLowerCase())) {
      logger.warn(`User operation validation failed: ${operation} not allowed`);
      return res.status(400).json({
        error: `Operation not allowed: ${operation}`,
        code: 'OPERATION_NOT_ALLOWED',
      });
    }

    logger.debug(`User operation validated: ${userId} - ${operation}`);
    next();
  };
}

export {
  requireUserRole,
  validateUserSession,
  blockAdminAccessToUserEndpoints,
  logUnauthorizedUserEndpointAccess,
  validateUserOperation,
};