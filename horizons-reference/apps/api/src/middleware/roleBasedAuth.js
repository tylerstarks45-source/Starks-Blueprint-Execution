import roleBasedAccessControlService from '../services/auth/RoleBasedAccessControlService.js';
import enhancedAuthService from '../services/auth/EnhancedAuthService.js';
import sessionIsolationService from '../services/auth/SessionIsolationService.js';
import logger from '../utils/logger.js';

function extractSessionToken(req) {
  // Extract from Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Extract from x-session-token header
  if (req.headers['x-session-token']) {
    return req.headers['x-session-token'];
  }

  // Extract from query parameter
  if (req.query && req.query.sessionToken) {
    return req.query.sessionToken;
  }

  return null;
}

function requireAuth() {
  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      logger.warn('Authentication attempt without session token');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    const validation = enhancedAuthService.validateSession(sessionToken);

    if (!validation.valid) {
      logger.warn(`Session validation failed: ${validation.code}`);
      return res.status(401).json({
        error: validation.error,
        code: validation.code,
      });
    }

    // Validate session ownership and boundary
    const boundaryCheck = sessionIsolationService.enforceSessionBoundary(
      sessionToken,
      validation.userId
    );

    if (!boundaryCheck.enforced) {
      logger.warn(`Session boundary violation: ${validation.userId}`);
      return res.status(403).json({
        error: boundaryCheck.error,
        code: boundaryCheck.code,
      });
    }

    // Attach session info to request
    req.sessionToken = sessionToken;
    req.userId = validation.userId;
    req.userRole = validation.role;

    next();
  };
}

function requireRole(role) {
  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      logger.warn(`Role-based access attempt without session token (required: ${role})`);
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    const validation = enhancedAuthService.validateSession(sessionToken);

    if (!validation.valid) {
      logger.warn(`Session validation failed for role check: ${validation.code}`);
      return res.status(401).json({
        error: validation.error,
        code: validation.code,
      });
    }

    // Validate session boundary
    const boundaryCheck = sessionIsolationService.enforceSessionBoundary(
      sessionToken,
      validation.userId
    );

    if (!boundaryCheck.enforced) {
      logger.warn(`Session boundary violation during role check: ${validation.userId}`);
      return res.status(403).json({
        error: boundaryCheck.error,
        code: boundaryCheck.code,
      });
    }

    // Validate role
    const roleValidation = roleBasedAccessControlService.validateRoleAccess(
      validation.userId,
      role
    );

    if (!roleValidation.valid) {
      logger.warn(`Unauthorized access attempt: ${validation.userId} requires ${role}`);
      return res.status(403).json({
        error: roleValidation.error,
        code: roleValidation.code,
      });
    }

    // Attach session info to request
    req.sessionToken = sessionToken;
    req.userId = validation.userId;
    req.userRole = validation.role;

    next();
  };
}

function requireSuperAdmin() {
  return requireRole('SUPER_ADMIN');
}

function requireUser() {
  return requireRole('USER');
}

function validateRoleAccess(requiredRole) {
  if (!requiredRole) {
    throw new Error('Required role is required');
  }

  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    const validation = enhancedAuthService.validateSession(sessionToken);

    if (!validation.valid) {
      return res.status(401).json({
        error: validation.error,
        code: validation.code,
      });
    }

    const roleValidation = roleBasedAccessControlService.validateRoleAccess(
      validation.userId,
      requiredRole
    );

    if (!roleValidation.valid) {
      logger.warn(`Role access validation failed: ${validation.userId} requires ${requiredRole}`);
      return res.status(403).json({
        error: roleValidation.error,
        code: roleValidation.code,
      });
    }

    req.sessionToken = sessionToken;
    req.userId = validation.userId;
    req.userRole = validation.role;

    next();
  };
}

function checkFeatureAccess(feature) {
  if (!feature) {
    throw new Error('Feature is required');
  }

  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    const validation = enhancedAuthService.validateSession(sessionToken);

    if (!validation.valid) {
      return res.status(401).json({
        error: validation.error,
        code: validation.code,
      });
    }

    const featureAccess = roleBasedAccessControlService.canAccessFeature(
      validation.userId,
      feature
    );

    if (!featureAccess.allowed) {
      logger.warn(`Feature access denied: ${validation.userId} cannot access ${feature}`);
      return res.status(403).json({
        error: featureAccess.error,
        code: featureAccess.code,
      });
    }

    req.sessionToken = sessionToken;
    req.userId = validation.userId;
    req.userRole = validation.role;

    next();
  };
}

function logUnauthorizedAccess(userId, route, reason) {
  if (!userId || !route || !reason) {
    logger.warn('Invalid unauthorized access log parameters');
    return null;
  }

  const logEntry = {
    userId,
    route,
    reason,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`Unauthorized access attempt: ${userId} on ${route} (${reason})`);
  return logEntry;
}

export {
  requireAuth,
  requireRole,
  requireSuperAdmin,
  requireUser,
  validateRoleAccess,
  checkFeatureAccess,
  logUnauthorizedAccess,
};