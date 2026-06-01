import auditLogService from '../services/audit/AuditLogService.js';
import logger from '../utils/logger.js';

function trackAdminOperation(userId, action, resource, details = {}) {
  if (!userId || !action || !resource) {
    logger.warn('Invalid admin operation tracking parameters');
    return null;
  }

  const operation = {
    userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
  };

  logger.debug(`Admin operation tracked: ${userId} - ${action} on ${resource}`);
  return operation;
}

function logAdminAccess(userId, resource, action) {
  if (!userId || !resource || !action) {
    logger.warn('Invalid admin access log parameters');
    return null;
  }

  const access = {
    userId,
    resource,
    action,
    timestamp: new Date().toISOString(),
  };

  logger.info(`Admin access logged: ${userId} - ${action} on ${resource}`);
  return access;
}

function logAdminActionMiddleware() {
  return (req, res, next) => {
    // Check if user is admin
    const userRole = req.auth?.role || req.user?.role;
    const userId = req.auth?.id || req.user?.id || req.userId;

    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    if (isAdmin && userId) {
      // Log admin action asynchronously (non-blocking)
      setImmediate(() => {
        try {
          const action = req.method.toUpperCase();
          const resource = req.path;
          const details = {
            method: req.method,
            path: req.path,
            query: req.query,
            role: userRole,
          };

          // Track the operation
          trackAdminOperation(userId, action, resource, details);

          // Log admin access
          logAdminAccess(userId, resource, action);

          // Log to audit service
          auditLogService.logAdminAction(userId, action, {
            resource,
            method: req.method,
            path: req.path,
            role: userRole,
          });
        } catch (error) {
          logger.error(`Error logging admin action: ${error.message}`);
        }
      });
    }

    // Continue to next middleware immediately (non-blocking)
    next();
  };
}

export { logAdminActionMiddleware, trackAdminOperation, logAdminAccess };