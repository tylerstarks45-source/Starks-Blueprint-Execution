import authRequestProtectionService from '../services/security/AuthRequestProtectionService.js';
import logger from '../utils/logger.js';

function rejectAuthRateLimitedRequest(email, remaining, lockedUntil) {
  if (!email) {
    logger.warn('Invalid auth rate limit rejection parameters');
    return null;
  }

  const violation = {
    email,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`Auth rate limit rejected: ${email}`);
  return violation;
}

function enforceAuthRateLimit(authType = 'login') {
  return (req, res, next) => {
    try {
      // Extract email from request body
      const email = req.body?.email;

      // If no email, allow request to proceed (validation will catch it)
      if (!email) {
        logger.debug(`Auth rate limit check skipped: no email in request`);
        return next();
      }

      if (typeof email !== 'string') {
        logger.debug(`Auth rate limit check skipped: invalid email type`);
        return next();
      }

      // Check auth rate limit
      const limitCheck = authRequestProtectionService.checkAuthRateLimit(email, authType);

      if (!limitCheck.allowed) {
        // Log the violation
        rejectAuthRateLimitedRequest(email, limitCheck.attemptsRemaining, limitCheck.lockedUntil);

        // Return 429 Too Many Requests
        const statusCode = limitCheck.code === 'ACCOUNT_LOCKED' ? 429 : 429;
        return res.status(statusCode).json({
          error: 'Too many authentication attempts',
          code: limitCheck.code,
          message: limitCheck.error,
          details: {
            email,
            attemptsRemaining: limitCheck.attemptsRemaining,
            maxAttempts: limitCheck.maxAttempts,
            lockedUntil: limitCheck.lockedUntil,
            minutesRemaining: limitCheck.minutesRemaining,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Increment auth attempt
      const incrementResult = authRequestProtectionService.incrementAuthAttempt(email, authType);

      // Add auth limit info to response headers
      res.setHeader('X-Auth-Attempts-Remaining', incrementResult.attemptsRemaining);
      res.setHeader('X-Auth-Max-Attempts', incrementResult.maxAttempts);
      res.setHeader('X-Auth-Reset-Time', incrementResult.resetTime);

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error(`Auth rate limiting middleware error: ${error.message}`);
      // On error, allow request to proceed
      next();
    }
  };
}

export { enforceAuthRateLimit, rejectAuthRateLimitedRequest };