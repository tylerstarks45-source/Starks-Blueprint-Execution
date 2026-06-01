import logger from '../utils/logger.js';
import enhancedSessionManagementService from '../services/auth/EnhancedSessionManagementService.js';
import sessionExpirationService from '../services/auth/SessionExpirationService.js';
import invalidTokenRejectionService from '../services/auth/InvalidTokenRejectionService.js';

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

  // Extract from session cookie
  if (req.cookies && req.cookies.sessionToken) {
    return req.cookies.sessionToken;
  }

  // Extract from query parameter (not recommended but supported)
  if (req.query && req.query.sessionToken) {
    return req.query.sessionToken;
  }

  return null;
}

function validateSession() {
  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      logger.warn('Session validation: missing session token');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    try {
      // Validate token format
      invalidTokenRejectionService.validateTokenFormat(sessionToken);

      // Validate session exists and is active
      enhancedSessionManagementService.validateSessionActive(sessionToken);

      // Validate session integrity
      enhancedSessionManagementService.validateSessionIntegrity(sessionToken);

      // Validate session is not expired
      enhancedSessionManagementService.validateSessionExpiration(sessionToken);

      // Validate token is not revoked
      invalidTokenRejectionService.validateTokenNotRevoked(sessionToken);

      // Update session activity
      enhancedSessionManagementService.updateSessionActivity(sessionToken);

      // Get session metadata
      const metadata = enhancedSessionManagementService.getSessionMetadata(sessionToken);

      // Attach session info to request
      req.sessionToken = sessionToken;
      req.user = req.user || {};
      req.user.id = metadata.userId;
      req.user.role = metadata.role;
      req.auth = req.auth || {};
      req.auth.id = metadata.userId;
      req.auth.role = metadata.role;

      logger.debug(`Session validated: ${metadata.userId}`);
      next();
    } catch (error) {
      logger.warn(`Session validation failed: ${error.message}`);
      logSessionValidationFailure(sessionToken, error.message);
      return res.status(403).json({
        error: error.message,
        code: 'SESSION_VALIDATION_FAILED',
      });
    }
  };
}

function validateSessionIntegrity() {
  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      logger.warn('Session integrity validation: missing session token');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    try {
      enhancedSessionManagementService.validateSessionIntegrity(sessionToken);
      logger.debug(`Session integrity validated: ${sessionToken}`);
      next();
    } catch (error) {
      logger.error(`Session integrity validation failed: ${error.message}`);
      logSessionValidationFailure(sessionToken, 'integrity-check-failed');
      return res.status(403).json({
        error: error.message,
        code: 'INTEGRITY_VALIDATION_FAILED',
      });
    }
  };
}

function validateSessionExpiration() {
  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      logger.warn('Session expiration validation: missing session token');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    try {
      enhancedSessionManagementService.validateSessionExpiration(sessionToken);
      logger.debug(`Session expiration validated: ${sessionToken}`);
      next();
    } catch (error) {
      logger.warn(`Session expiration validation failed: ${error.message}`);
      logSessionValidationFailure(sessionToken, 'session-expired');
      return res.status(403).json({
        error: error.message,
        code: 'SESSION_EXPIRED',
      });
    }
  };
}

function validateSessionOwnership() {
  return (req, res, next) => {
    const sessionToken = extractSessionToken(req);
    const userId = req.user?.id || req.auth?.id;

    if (!sessionToken) {
      logger.warn('Session ownership validation: missing session token');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    if (!userId) {
      logger.warn('Session ownership validation: missing user ID');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_USER_ID',
      });
    }

    try {
      enhancedSessionManagementService.validateSessionOwnership(sessionToken, userId);
      logger.debug(`Session ownership validated: ${userId}`);
      next();
    } catch (error) {
      logger.error(`Session ownership validation failed: ${error.message}`);
      logSessionValidationFailure(sessionToken, 'ownership-check-failed');
      return res.status(403).json({
        error: error.message,
        code: 'OWNERSHIP_VALIDATION_FAILED',
      });
    }
  };
}

function rejectInvalidSession(reason) {
  if (!reason || typeof reason !== 'string') {
    throw new Error('Reason is required and must be a string');
  }

  const error = new Error(`Invalid session: ${reason}`);
  error.statusCode = 403;
  error.code = 'INVALID_SESSION';
  error.reason = reason;

  logger.error(`Invalid session rejected: ${reason}`);
  throw error;
}

function logSessionValidationFailure(sessionToken, reason) {
  if (!sessionToken || !reason) {
    logger.warn('Invalid session validation failure log parameters');
    return null;
  }

  const logEntry = {
    sessionToken: sessionToken.substring(0, 20) + '...',
    reason,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`Session validation failure: ${reason}`);
  return logEntry;
}

export {
  validateSession,
  validateSessionIntegrity,
  validateSessionExpiration,
  validateSessionOwnership,
  rejectInvalidSession,
  logSessionValidationFailure,
};