import rateLimitingService from '../services/security/RateLimitingService.js';
import logger from '../utils/logger.js';

function rejectRateLimitedRequest(userId, endpoint, remaining, resetTime) {
  if (!userId || !endpoint) {
    logger.warn('Invalid rate limit rejection parameters');
    return null;
  }

  const violation = {
    userId,
    endpoint,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`Rate limit rejected: ${userId} on ${endpoint}`);
  return violation;
}

function enforceRateLimit() {
  return (req, res, next) => {
    try {
      // Extract user ID from request
      const userId = req.auth?.id || req.user?.id || req.userId || req.headers['x-user-id'];

      // Skip rate limiting for public endpoints
      const publicEndpoints = ['/health', '/setup/initialization-status'];
      if (publicEndpoints.includes(req.path)) {
        return next();
      }

      // If no user ID, allow request but log it
      if (!userId) {
        logger.debug(`Rate limit check skipped: no user ID for ${req.path}`);
        return next();
      }

      // Get endpoint path
      const endpoint = req.path;

      // Check rate limit
      const limitCheck = rateLimitingService.checkRateLimit(userId, endpoint);

      if (!limitCheck.allowed) {
        // Log the violation
        rejectRateLimitedRequest(userId, endpoint, limitCheck.remaining, limitCheck.resetTime);

        // Return 429 Too Many Requests
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for endpoint ${endpoint}`,
          details: {
            endpoint,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
            resetTime: limitCheck.resetTime,
            resetTimeMs: limitCheck.resetTimeMs,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Increment request count
      const incrementResult = rateLimitingService.incrementRequestCount(userId, endpoint);

      // Add rate limit info to response headers
      res.setHeader('X-RateLimit-Limit', incrementResult.limit);
      res.setHeader('X-RateLimit-Remaining', incrementResult.remaining);
      res.setHeader('X-RateLimit-Reset', incrementResult.resetTime);

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error(`Rate limiting middleware error: ${error.message}`);
      // On error, allow request to proceed
      next();
    }
  };
}

export { enforceRateLimit, rejectRateLimitedRequest };