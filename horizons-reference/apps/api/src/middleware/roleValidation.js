import logger from '../utils/logger.js';

function validateUserRole() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Role validation: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    if (typeof userRole !== 'string') {
      logger.warn('Role validation: invalid user role type');
      return res.status(401).json({
        error: 'Invalid authentication',
        code: 'INVALID_ROLE_TYPE',
      });
    }

    const validRoles = ['SUPER_ADMIN', 'USER'];
    if (!validRoles.includes(userRole)) {
      logger.warn(`Role validation: invalid role ${userRole}`);
      return res.status(403).json({
        error: 'Invalid user role',
        code: 'INVALID_ROLE',
      });
    }

    // Attach validated role to request
    req.validatedRole = userRole;

    logger.debug(`Role validation passed: ${userId} has ${userRole}`);
    next();
  };
}

function validateRoleConsistency() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const sessionRole = req.session?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Role consistency validation: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    // Validate role consistency if session role exists
    if (sessionRole && sessionRole !== userRole) {
      logger.error(`Role consistency violation: ${userId} session role ${sessionRole} != user role ${userRole}`);
      return res.status(403).json({
        error: 'Session integrity violation',
        code: 'ROLE_CONSISTENCY_FAILED',
      });
    }

    logger.debug(`Role consistency validated: ${userId}`);
    next();
  };
}

function preventRoleSpoofing() {
  return (req, res, next) => {
    const userRole = req.user?.role || req.auth?.role;
    const claimedRole = req.body?.role || req.query?.role;
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userRole) {
      logger.warn('Role spoofing prevention: missing user role');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_ROLE',
      });
    }

    // If request claims a role, verify it matches actual role
    if (claimedRole && claimedRole !== userRole) {
      logger.error(`Role spoofing attempt: ${userId} claimed ${claimedRole} but has ${userRole}`);
      logRoleViolation(userId, claimedRole, userRole);
      return res.status(403).json({
        error: 'Role spoofing detected',
        code: 'ROLE_SPOOFING_BLOCKED',
      });
    }

    logger.debug(`Role spoofing prevention passed: ${userId}`);
    next();
  };
}

function logRoleViolation(userId, claimedRole, actualRole) {
  if (!userId || !claimedRole || !actualRole) {
    logger.warn('Invalid role violation log parameters');
    return null;
  }

  const logEntry = {
    userId,
    claimedRole,
    actualRole,
    timestamp: new Date().toISOString(),
  };

  logger.error(`Role violation: ${userId} claimed ${claimedRole} but has ${actualRole}`);
  return logEntry;
}

export {
  validateUserRole,
  validateRoleConsistency,
  preventRoleSpoofing,
  logRoleViolation,
};