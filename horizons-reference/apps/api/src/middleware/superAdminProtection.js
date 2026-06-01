import roleAwareEndpointProtectionService from '../services/security/RoleAwareEndpointProtectionService.js';
import logger from '../utils/logger.js';

function requireSuperAdmin() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Super Admin check: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole !== 'SUPER_ADMIN') {
      logger.warn(`Super Admin check failed: ${userId} has ${userRole} role`);
      logUnauthorizedAdminAccess(userId, req.path);
      return res.status(403).json({
        error: 'Super Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    logger.debug(`Super Admin check passed: ${userId}`);
    next();
  };
}

function validateSuperAdminSession() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const sessionRole = req.session?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Super Admin session validation: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole !== 'SUPER_ADMIN') {
      logger.warn(`Super Admin session validation failed: ${userId} has ${userRole} role`);
      return res.status(403).json({
        error: 'Super Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Validate role consistency if session role exists
    if (sessionRole && sessionRole !== userRole) {
      logger.error(`Super Admin session integrity violation: ${userId} session role ${sessionRole} != user role ${userRole}`);
      return res.status(403).json({
        error: 'Session integrity violation',
        code: 'SESSION_INTEGRITY_FAILED',
      });
    }

    logger.debug(`Super Admin session validated: ${userId}`);
    next();
  };
}

function blockNonAdminAccess() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Non-admin access block: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole !== 'SUPER_ADMIN') {
      logger.warn(`Non-admin access blocked: ${userId} has ${userRole} role`);
      logUnauthorizedAdminAccess(userId, req.path);
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED',
      });
    }

    logger.debug(`Non-admin access block passed: ${userId}`);
    next();
  };
}

function logUnauthorizedAdminAccess(userId, endpoint) {
  if (!userId || !endpoint) {
    logger.warn('Invalid unauthorized admin access log parameters');
    return null;
  }

  const logEntry = {
    userId,
    endpoint,
    timestamp: new Date().toISOString(),
  };

  logger.error(`Unauthorized admin access attempt: ${userId} on ${endpoint}`);
  return logEntry;
}

function validateAdminOperation(operation) {
  if (!operation || typeof operation !== 'string') {
    throw new Error('Operation is required and must be a string');
  }

  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Admin operation validation: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (userRole !== 'SUPER_ADMIN') {
      logger.warn(`Admin operation validation failed: ${userId} has ${userRole} role`);
      return res.status(403).json({
        error: 'Super Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Validate operation is allowed for admin
    const allowedOperations = ['read', 'write', 'delete', 'manage', 'configure'];
    if (!allowedOperations.includes(operation.toLowerCase())) {
      logger.warn(`Admin operation validation failed: ${operation} not allowed`);
      return res.status(400).json({
        error: `Operation not allowed: ${operation}`,
        code: 'OPERATION_NOT_ALLOWED',
      });
    }

    logger.debug(`Admin operation validated: ${userId} - ${operation}`);
    next();
  };
}

export {
  requireSuperAdmin,
  validateSuperAdminSession,
  blockNonAdminAccess,
  logUnauthorizedAdminAccess,
  validateAdminOperation,
};