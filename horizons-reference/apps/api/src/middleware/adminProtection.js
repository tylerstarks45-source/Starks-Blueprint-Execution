import superAdminAccountService from '../services/admin/SuperAdminAccountService.js';
import logger from '../utils/logger.js';

function protectSuperAdminAccount() {
  return (req, res, next) => {
    const targetUserId = req.params.userId || req.body?.userId;
    const operation = req.method.toUpperCase();

    if (!targetUserId) {
      return next();
    }

    // Check if target is Super Admin
    if (superAdminAccountService.isSuperAdminAccount(targetUserId)) {
      // Allow GET operations
      if (operation === 'GET') {
        return next();
      }

      // Block DELETE, PUT, PATCH operations
      if (['DELETE', 'PUT', 'PATCH'].includes(operation)) {
        logger.error(`Super Admin protection: ${operation} operation blocked on Super Admin account`);
        return res.status(403).json({
          error: 'Super Admin account cannot be modified',
          code: 'SUPER_ADMIN_PROTECTED',
        });
      }
    }

    next();
  };
}

function validateAdminOperation(operation) {
  if (!operation || typeof operation !== 'string') {
    throw new Error('Operation is required');
  }

  return (req, res, next) => {
    const targetUserId = req.params.userId || req.body?.userId;
    const adminId = req.userId;

    if (!targetUserId) {
      return next();
    }

    // Check if target is Super Admin
    if (superAdminAccountService.isSuperAdminAccount(targetUserId)) {
      const allowedOperations = ['read', 'view', 'get'];

      if (!allowedOperations.includes(operation.toLowerCase())) {
        logger.warn(`Admin operation validation failed: ${operation} not allowed on Super Admin`);
        return res.status(403).json({
          error: `Operation '${operation}' is not allowed on Super Admin account`,
          code: 'OPERATION_NOT_ALLOWED',
        });
      }
    }

    next();
  };
}

function preventAdminDeletion() {
  return (req, res, next) => {
    const targetUserId = req.params.userId || req.body?.userId;

    if (!targetUserId) {
      return next();
    }

    // Check if target is Super Admin
    if (superAdminAccountService.isSuperAdminAccount(targetUserId)) {
      logger.error(`Super Admin deletion attempt blocked: ${targetUserId}`);
      logAdminProtection('DELETION_ATTEMPT_BLOCKED', { targetUserId });
      return res.status(403).json({
        error: 'Super Admin account cannot be deleted',
        code: 'SUPER_ADMIN_DELETION_BLOCKED',
      });
    }

    next();
  };
}

function logAdminProtection(action, details = {}) {
  if (!action || typeof action !== 'string') {
    logger.warn('Invalid admin protection log parameters');
    return null;
  }

  const logEntry = {
    action,
    details,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`Admin protection: ${action}`, details);
  return logEntry;
}

export {
  protectSuperAdminAccount,
  validateAdminOperation,
  preventAdminDeletion,
  logAdminProtection,
};