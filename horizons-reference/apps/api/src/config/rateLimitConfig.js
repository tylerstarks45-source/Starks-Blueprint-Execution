import 'dotenv/config';
import logger from '../utils/logger.js';

class RateLimitConfig {
  constructor() {
    this.defaultLimits = this.initializeDefaultLimits();
    this.authLimits = this.initializeAuthLimits();
    this.endpointLimits = this.initializeEndpointLimits();
    this.validateOnInit();
  }

  initializeDefaultLimits() {
    return {
      general: {
        requestsPerMinute: 100,
        windowMs: 60 * 1000, // 1 minute
        description: 'General API rate limit',
      },
      user: {
        requestsPerMinute: 50,
        windowMs: 60 * 1000, // 1 minute
        description: 'User endpoints rate limit',
      },
      admin: {
        requestsPerMinute: 200,
        windowMs: 60 * 1000, // 1 minute
        description: 'Admin endpoints rate limit',
      },
    };
  }

  initializeAuthLimits() {
    return {
      login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
        description: 'Login rate limit: 5 attempts per 15 minutes',
      },
      signup: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        lockoutDurationMs: 60 * 60 * 1000, // 1 hour
        description: 'Signup rate limit: 3 attempts per hour',
      },
      passwordReset: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        lockoutDurationMs: 60 * 60 * 1000, // 1 hour
        description: 'Password reset rate limit: 3 attempts per hour',
      },
    };
  }

  initializeEndpointLimits() {
    return {
      '/auth/login': {
        requestsPerWindow: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        description: 'Login endpoint: 5 requests per 15 minutes',
      },
      '/auth/signup': {
        requestsPerWindow: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        description: 'Signup endpoint: 3 requests per hour',
      },
      '/auth/password-reset': {
        requestsPerWindow: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        description: 'Password reset endpoint: 3 requests per hour',
      },
      '/user/resources': {
        requestsPerWindow: 100,
        windowMs: 60 * 1000, // 1 minute
        description: 'User resources endpoint: 100 requests per minute',
      },
      '/admin': {
        requestsPerWindow: 200,
        windowMs: 60 * 1000, // 1 minute
        description: 'Admin endpoints: 200 requests per minute',
      },
    };
  }

  validateOnInit() {
    const validation = this.validateConfig();
    if (!validation.valid) {
      logger.error(`Rate limit configuration validation failed: ${validation.errors.join(', ')}`);
      throw new Error(`Rate limit configuration error: ${validation.errors.join(', ')}`);
    }
    logger.info('Rate limit configuration validated successfully');
  }

  validateConfig() {
    const errors = [];

    // Validate default limits
    Object.entries(this.defaultLimits).forEach(([key, limit]) => {
      if (!limit.requestsPerMinute || typeof limit.requestsPerMinute !== 'number') {
        errors.push(`Default limit '${key}' missing or invalid requestsPerMinute`);
      }
      if (!limit.windowMs || typeof limit.windowMs !== 'number') {
        errors.push(`Default limit '${key}' missing or invalid windowMs`);
      }
    });

    // Validate auth limits
    Object.entries(this.authLimits).forEach(([key, limit]) => {
      if (!limit.maxAttempts || typeof limit.maxAttempts !== 'number') {
        errors.push(`Auth limit '${key}' missing or invalid maxAttempts`);
      }
      if (!limit.windowMs || typeof limit.windowMs !== 'number') {
        errors.push(`Auth limit '${key}' missing or invalid windowMs`);
      }
      if (!limit.lockoutDurationMs || typeof limit.lockoutDurationMs !== 'number') {
        errors.push(`Auth limit '${key}' missing or invalid lockoutDurationMs`);
      }
    });

    // Validate endpoint limits
    Object.entries(this.endpointLimits).forEach(([endpoint, limit]) => {
      if (!limit.requestsPerWindow || typeof limit.requestsPerWindow !== 'number') {
        errors.push(`Endpoint limit '${endpoint}' missing or invalid requestsPerWindow`);
      }
      if (!limit.windowMs || typeof limit.windowMs !== 'number') {
        errors.push(`Endpoint limit '${endpoint}' missing or invalid windowMs`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getDefaultLimit(limitType = 'general') {
    const limit = this.defaultLimits[limitType];
    if (!limit) {
      throw new Error(`Unknown default limit type: ${limitType}`);
    }
    return limit;
  }

  getAuthLimit(authType = 'login') {
    const limit = this.authLimits[authType];
    if (!limit) {
      throw new Error(`Unknown auth limit type: ${authType}`);
    }
    return limit;
  }

  getEndpointLimit(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint is required and must be a string');
    }

    // Check exact match first
    if (endpoint in this.endpointLimits) {
      return this.endpointLimits[endpoint];
    }

    // Check pattern match for admin endpoints
    if (endpoint.startsWith('/admin')) {
      return this.endpointLimits['/admin'];
    }

    // Return default limit
    return this.getDefaultLimit('general');
  }

  getAllLimits() {
    return {
      defaultLimits: this.defaultLimits,
      authLimits: this.authLimits,
      endpointLimits: this.endpointLimits,
      timestamp: new Date().toISOString(),
    };
  }

  getConfigStatus() {
    return {
      configured: true,
      defaultLimitsCount: Object.keys(this.defaultLimits).length,
      authLimitsCount: Object.keys(this.authLimits).length,
      endpointLimitsCount: Object.keys(this.endpointLimits).length,
      timestamp: new Date().toISOString(),
    };
  }
}

const config = new RateLimitConfig();

export default config;
export { RateLimitConfig };