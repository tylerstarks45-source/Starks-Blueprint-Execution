import auditLogService from '../services/audit/AuditLogService.js';
import logger from '../utils/logger.js';

function logRequest(req) {
  if (!req) {
    return null;
  }

  const requestInfo = {
    method: req.method,
    path: req.path,
    userId: req.auth?.id || req.user?.id || req.userId || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  logger.debug(`Request logged: ${requestInfo.method} ${requestInfo.path}`);
  return requestInfo;
}

function logResponse(req, res, status) {
  if (!req || !res || typeof status !== 'number') {
    return null;
  }

  const responseInfo = {
    method: req.method,
    path: req.path,
    status,
    userId: req.auth?.id || req.user?.id || req.userId || 'anonymous',
    timestamp: new Date().toISOString(),
  };

  logger.debug(`Response logged: ${responseInfo.method} ${responseInfo.path} - ${status}`);
  return responseInfo;
}

function logError(req, error) {
  if (!req || !error) {
    return null;
  }

  const errorInfo = {
    method: req.method,
    path: req.path,
    userId: req.auth?.id || req.user?.id || req.userId || 'anonymous',
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
  };

  logger.error(`Error logged: ${errorInfo.method} ${errorInfo.path} - ${error.message}`);
  return errorInfo;
}

function auditLoggingMiddleware() {
  return (req, res, next) => {
    // Log incoming request asynchronously (non-blocking)
    setImmediate(() => {
      try {
        logRequest(req);
      } catch (error) {
        logger.error(`Error logging request: ${error.message}`);
      }
    });

    // Wrap response methods to capture response status
    const originalJson = res.json;
    const originalSend = res.send;

    res.json = function (data) {
      // Log response asynchronously (non-blocking)
      setImmediate(() => {
        try {
          logResponse(req, res, res.statusCode);
        } catch (error) {
          logger.error(`Error logging response: ${error.message}`);
        }
      });

      return originalJson.call(this, data);
    };

    res.send = function (data) {
      // Log response asynchronously (non-blocking)
      setImmediate(() => {
        try {
          logResponse(req, res, res.statusCode);
        } catch (error) {
          logger.error(`Error logging response: ${error.message}`);
        }
      });

      return originalSend.call(this, data);
    };

    // Continue to next middleware immediately (non-blocking)
    next();
  };
}

export { auditLoggingMiddleware, logRequest, logResponse, logError };