import userOwnershipValidationService from '../services/security/UserOwnershipValidationService.js';
import logger from '../utils/logger.js';

function requireAuthenticatedUser() {
  return (req, res, next) => {
    // Extract authenticated user from request
    const userId = req.user?.id || req.auth?.id || req.userId;

    if (!userId) {
      logger.warn('Authenticated resource access attempt without user ID');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTHENTICATION',
      });
    }

    if (typeof userId !== 'string') {
      logger.warn('Invalid user ID type in authentication');
      return res.status(401).json({
        error: 'Invalid authentication',
        code: 'INVALID_USER_ID',
      });
    }

    // Attach authenticated user to request
    req.authenticatedUserId = userId;
    req.user = req.user || {};
    req.user.id = userId;

    logger.debug(`Authenticated user: ${userId}`);
    next();
  };
}

function validateResourceOwnership(resourceType) {
  if (!resourceType || typeof resourceType !== 'string') {
    throw new Error('Resource type is required and must be a string');
  }

  return (req, res, next) => {
    const userId = req.authenticatedUserId || req.user?.id || req.auth?.id;
    const resourceId = req.params.id || req.params.resourceId || req.params[`${resourceType}Id`];

    if (!userId) {
      logger.warn('Resource ownership validation without authenticated user');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTHENTICATION',
      });
    }

    if (!resourceId) {
      logger.warn(`Resource ownership validation without resource ID (type: ${resourceType})`);
      return res.status(400).json({
        error: `${resourceType} ID is required`,
        code: 'MISSING_RESOURCE_ID',
      });
    }

    try {
      const validation = userOwnershipValidationService.validateOwnershipBeforeAccess(
        userId,
        resourceId,
        resourceType
      );

      if (!validation.valid) {
        logger.warn(`Resource ownership validation failed: ${userId} accessing ${resourceType} ${resourceId}`);
        return res.status(403).json({
          error: validation.error,
          code: validation.code,
        });
      }

      // Attach validated resource info to request
      req.resourceId = resourceId;
      req.resourceType = resourceType;
      req.resourceOwned = true;

      logger.debug(`Resource ownership validated: ${userId} owns ${resourceType} ${resourceId}`);
      next();
    } catch (error) {
      logger.error(`Resource ownership validation error: ${error.message}`);
      return res.status(403).json({
        error: error.message,
        code: 'OWNERSHIP_VALIDATION_ERROR',
      });
    }
  };
}

function enforceUserResourceBoundary() {
  return (req, res, next) => {
    const authenticatedUserId = req.authenticatedUserId || req.user?.id || req.auth?.id;
    const resourceUserId = req.body?.userId || req.query?.userId || req.params?.userId;

    if (!authenticatedUserId) {
      logger.warn('User resource boundary enforcement without authenticated user');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTHENTICATION',
      });
    }

    // If request specifies a userId, it must match authenticated user
    if (resourceUserId && resourceUserId !== authenticatedUserId) {
      logger.error(`User resource boundary violation: ${authenticatedUserId} attempted to access ${resourceUserId} resources`);
      logResourceAccessViolation(authenticatedUserId, resourceUserId, 'cross-user-access');
      return res.status(403).json({
        error: 'User resource boundary violation: Cannot access other users resources',
        code: 'BOUNDARY_VIOLATION',
      });
    }

    // Ensure userId in request body matches authenticated user
    if (req.body && !req.body.userId) {
      req.body.userId = authenticatedUserId;
    }

    logger.debug(`User resource boundary enforced for ${authenticatedUserId}`);
    next();
  };
}

function validateUserCanAccessResource(resourceType) {
  if (!resourceType || typeof resourceType !== 'string') {
    throw new Error('Resource type is required and must be a string');
  }

  return (req, res, next) => {
    const userId = req.authenticatedUserId || req.user?.id || req.auth?.id;
    const resourceId = req.params.id || req.params.resourceId || req.params[`${resourceType}Id`];

    if (!userId) {
      logger.warn('Resource access validation without authenticated user');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTHENTICATION',
      });
    }

    if (!resourceId) {
      // Allow access to list endpoints without resource ID
      logger.debug(`Resource access validation: list endpoint for ${resourceType}`);
      return next();
    }

    try {
      const validation = userOwnershipValidationService.validateOwnershipBeforeAccess(
        userId,
        resourceId,
        resourceType
      );

      if (!validation.valid) {
        logger.warn(`Resource access denied: ${userId} cannot access ${resourceType} ${resourceId}`);
        logResourceAccessViolation(userId, resourceId, resourceType);
        return res.status(403).json({
          error: validation.error,
          code: validation.code,
        });
      }

      logger.debug(`Resource access granted: ${userId} can access ${resourceType} ${resourceId}`);
      next();
    } catch (error) {
      logger.error(`Resource access validation error: ${error.message}`);
      return res.status(403).json({
        error: error.message,
        code: 'ACCESS_VALIDATION_ERROR',
      });
    }
  };
}

function logResourceAccessViolation(userId, resourceId, resourceType) {
  if (!userId || !resourceId || !resourceType) {
    logger.warn('Invalid resource access violation log parameters');
    return null;
  }

  const violation = {
    userId,
    resourceId,
    resourceType,
    timestamp: new Date().toISOString(),
  };

  logger.error(`Resource access violation: ${userId} attempted to access ${resourceType} ${resourceId}`);
  return violation;
}

export {
  requireAuthenticatedUser,
  validateResourceOwnership,
  enforceUserResourceBoundary,
  validateUserCanAccessResource,
  logResourceAccessViolation,
};