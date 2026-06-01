import logger from '../utils/logger.js';

const SUPER_ADMIN_LIST = [
  'tyler-starks', // Tyler Starks - Primary Super Admin
];

const ADMIN_LIST = [
  'tyler-starks',
];

function checkAdminStatus(userId) {
  if (!userId || typeof userId !== 'string') {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      role: 'user',
    };
  }

  const isSuperAdmin = SUPER_ADMIN_LIST.includes(userId);
  const isAdmin = ADMIN_LIST.includes(userId);

  return {
    isAdmin,
    isSuperAdmin,
    role: isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : 'user',
  };
}

function getSuperAdminList() {
  return {
    superAdmins: SUPER_ADMIN_LIST,
    count: SUPER_ADMIN_LIST.length,
    timestamp: new Date().toISOString(),
  };
}

function logAdminAction(adminId, action, details = {}) {
  if (!adminId || !action) {
    logger.warn('Invalid admin action log parameters');
    return null;
  }

  const logEntry = {
    adminId,
    action,
    details,
    timestamp: new Date().toISOString(),
  };

  logger.info(`Admin Action [${adminId}]: ${action}`, details);
  return logEntry;
}

function requireAuth() {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;

    if (!userId) {
      logger.warn('Authentication attempt without user ID');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_USER_ID',
      });
    }

    req.userId = userId;
    next();
  };
}

function requireAdmin() {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;

    if (!userId) {
      logger.warn('Admin access attempt without user ID');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_USER_ID',
      });
    }

    const adminStatus = checkAdminStatus(userId);

    if (!adminStatus.isAdmin) {
      logger.warn(`Unauthorized admin access attempt: ${userId}`);
      return res.status(403).json({
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    req.userId = userId;
    req.adminStatus = adminStatus;
    logAdminAction(userId, 'ADMIN_ACCESS', { endpoint: req.path });
    next();
  };
}

function requireSuperAdmin() {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;

    if (!userId) {
      logger.warn('Super admin access attempt without user ID');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_USER_ID',
      });
    }

    const adminStatus = checkAdminStatus(userId);

    if (!adminStatus.isSuperAdmin) {
      logger.warn(`Unauthorized super admin access attempt: ${userId}`);
      return res.status(403).json({
        error: 'Super admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    req.userId = userId;
    req.adminStatus = adminStatus;
    logAdminAction(userId, 'SUPER_ADMIN_ACCESS', { endpoint: req.path });
    next();
  };
}

export {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  checkAdminStatus,
  getSuperAdminList,
  logAdminAction,
};