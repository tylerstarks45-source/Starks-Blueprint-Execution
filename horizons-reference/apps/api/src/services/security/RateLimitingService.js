import 'dotenv/config';
import rateLimitConfig from '../../config/rateLimitConfig.js';
import logger from '../../utils/logger.js';

class RateLimitingService {
  constructor() {
    this.requestCounts = new Map(); // userId -> endpoint -> { count, resetTime }
    this.violationLog = [];
    this.maxViolationLogs = 1000;
    this.initialized = true;
    logger.info('Rate Limiting Service initialized');
  }

  checkRateLimit(userId, endpoint) {
    if (!userId || !endpoint) {
      return {
        allowed: false,
        error: 'User ID and endpoint are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof userId !== 'string' || typeof endpoint !== 'string') {
      return {
        allowed: false,
        error: 'User ID and endpoint must be strings',
        code: 'INVALID_PARAMETER_TYPE',
      };
    }

    const limit = rateLimitConfig.getEndpointLimit(endpoint);
    const now = Date.now();

    // Get or initialize user's request tracking
    if (!this.requestCounts.has(userId)) {
      this.requestCounts.set(userId, new Map());
    }

    const userEndpoints = this.requestCounts.get(userId);
    const endpointKey = `${endpoint}`;

    let requestData = userEndpoints.get(endpointKey);

    // Initialize or reset if window has expired
    if (!requestData || now >= requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + limit.windowMs,
      };
      userEndpoints.set(endpointKey, requestData);
    }

    const remaining = Math.max(0, limit.requestsPerWindow - requestData.count);
    const allowed = requestData.count < limit.requestsPerWindow;

    if (!allowed) {
      logger.warn(`Rate limit exceeded: ${userId} on ${endpoint} (${requestData.count}/${limit.requestsPerWindow})`);
      this.logRateLimitViolation(userId, endpoint, requestData.count, limit.requestsPerWindow);
    }

    return {
      allowed,
      remaining,
      resetTime: new Date(requestData.resetTime).toISOString(),
      resetTimeMs: requestData.resetTime,
      limit: limit.requestsPerWindow,
      code: allowed ? 'RATE_LIMIT_OK' : 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
    };
  }

  incrementRequestCount(userId, endpoint) {
    if (!userId || !endpoint) {
      throw new Error('User ID and endpoint are required');
    }

    const limit = rateLimitConfig.getEndpointLimit(endpoint);
    const now = Date.now();

    if (!this.requestCounts.has(userId)) {
      this.requestCounts.set(userId, new Map());
    }

    const userEndpoints = this.requestCounts.get(userId);
    const endpointKey = `${endpoint}`;

    let requestData = userEndpoints.get(endpointKey);

    // Initialize or reset if window has expired
    if (!requestData || now >= requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + limit.windowMs,
      };
    }

    requestData.count += 1;
    userEndpoints.set(endpointKey, requestData);

    const remaining = Math.max(0, limit.requestsPerWindow - requestData.count);

    logger.debug(`Request count incremented: ${userId} on ${endpoint} (${requestData.count}/${limit.requestsPerWindow})`);

    return {
      count: requestData.count,
      remaining,
      resetTime: new Date(requestData.resetTime).toISOString(),
      resetTimeMs: requestData.resetTime,
      limit: limit.requestsPerWindow,
      timestamp: new Date().toISOString(),
    };
  }

  getRemainingRequests(userId, endpoint) {
    if (!userId || !endpoint) {
      throw new Error('User ID and endpoint are required');
    }

    const limit = rateLimitConfig.getEndpointLimit(endpoint);
    const now = Date.now();

    if (!this.requestCounts.has(userId)) {
      return {
        userId,
        endpoint,
        remaining: limit.requestsPerWindow,
        limit: limit.requestsPerWindow,
        resetTime: new Date(now + limit.windowMs).toISOString(),
        timestamp: new Date().toISOString(),
      };
    }

    const userEndpoints = this.requestCounts.get(userId);
    const endpointKey = `${endpoint}`;
    const requestData = userEndpoints.get(endpointKey);

    if (!requestData || now >= requestData.resetTime) {
      return {
        userId,
        endpoint,
        remaining: limit.requestsPerWindow,
        limit: limit.requestsPerWindow,
        resetTime: new Date(now + limit.windowMs).toISOString(),
        timestamp: new Date().toISOString(),
      };
    }

    const remaining = Math.max(0, limit.requestsPerWindow - requestData.count);

    return {
      userId,
      endpoint,
      remaining,
      limit: limit.requestsPerWindow,
      resetTime: new Date(requestData.resetTime).toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  resetRateLimit(userId, endpoint) {
    if (!userId || !endpoint) {
      throw new Error('User ID and endpoint are required');
    }

    if (!this.requestCounts.has(userId)) {
      return {
        success: false,
        error: 'User not found in rate limit tracking',
        code: 'USER_NOT_FOUND',
      };
    }

    const userEndpoints = this.requestCounts.get(userId);
    const endpointKey = `${endpoint}`;

    if (!userEndpoints.has(endpointKey)) {
      return {
        success: false,
        error: 'Endpoint not found in user tracking',
        code: 'ENDPOINT_NOT_FOUND',
      };
    }

    userEndpoints.delete(endpointKey);
    logger.info(`Rate limit reset: ${userId} on ${endpoint}`);

    return {
      success: true,
      userId,
      endpoint,
      timestamp: new Date().toISOString(),
    };
  }

  getDefaultRateLimit(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint is required and must be a string');
    }

    const limit = rateLimitConfig.getEndpointLimit(endpoint);

    return {
      endpoint,
      requestsPerWindow: limit.requestsPerWindow,
      windowMs: limit.windowMs,
      windowSeconds: Math.round(limit.windowMs / 1000),
      description: limit.description,
      timestamp: new Date().toISOString(),
    };
  }

  logRateLimitViolation(userId, endpoint, currentCount, limit) {
    if (!userId || !endpoint || typeof currentCount !== 'number' || typeof limit !== 'number') {
      logger.warn('Invalid rate limit violation log parameters');
      return null;
    }

    const violation = {
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      endpoint,
      currentCount,
      limit,
      timestamp: new Date().toISOString(),
    };

    this.violationLog.push(violation);

    // Keep only last 1000 violations
    if (this.violationLog.length > this.maxViolationLogs) {
      this.violationLog = this.violationLog.slice(-this.maxViolationLogs);
    }

    logger.warn(`Rate limit violation: ${userId} on ${endpoint} (${currentCount}/${limit})`);
    return violation;
  }

  getViolationLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    return {
      violations: this.violationLog.slice(-limit),
      count: this.violationLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearViolationLog() {
    const clearedCount = this.violationLog.length;
    this.violationLog = [];
    logger.info(`Rate limit violation log cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }

  getServiceStatus() {
    return {
      initialized: this.initialized,
      trackedUsers: this.requestCounts.size,
      violationLogSize: this.violationLog.length,
      timestamp: new Date().toISOString(),
    };
  }

  cleanupExpiredWindows() {
    const now = Date.now();
    let clearedCount = 0;

    for (const [userId, userEndpoints] of this.requestCounts.entries()) {
      const endpointsToDelete = [];

      for (const [endpoint, requestData] of userEndpoints.entries()) {
        if (now >= requestData.resetTime) {
          endpointsToDelete.push(endpoint);
          clearedCount += 1;
        }
      }

      endpointsToDelete.forEach(endpoint => userEndpoints.delete(endpoint));

      // Remove user if no endpoints left
      if (userEndpoints.size === 0) {
        this.requestCounts.delete(userId);
      }
    }

    if (clearedCount > 0) {
      logger.debug(`Cleaned up ${clearedCount} expired rate limit windows`);
    }

    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const rateLimitingService = new RateLimitingService();

export default rateLimitingService;
export { RateLimitingService };