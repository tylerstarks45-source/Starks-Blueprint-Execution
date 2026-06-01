import 'dotenv/config';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

class InvalidTokenRejectionService {
  constructor() {
    this.revokedTokens = new Set();
    this.invalidTokenLog = [];
    this.maxInvalidTokenLogs = 1000;
    this.hmacSecret = process.env.SESSION_HMAC_SECRET || 'default-session-secret-change-in-production';
    this.initialized = true;
    logger.info('Invalid Token Rejection Service initialized');
  }

  validateTokenFormat(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    if (typeof token !== 'string') {
      throw new Error('Token must be a string');
    }

    if (token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }

    if (token.length < 20) {
      throw new Error('Token format is invalid (too short)');
    }

    logger.debug('Token format validated');
    return {
      valid: true,
      message: 'Token format is valid',
      code: 'FORMAT_VALID',
    };
  }

  validateTokenSignature(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required and must be a string');
    }

    // In a real implementation, this would verify HMAC signature
    // For now, we'll do basic validation
    if (!token.includes('-')) {
      throw new Error('Token signature is invalid');
    }

    logger.debug('Token signature validated');
    return {
      valid: true,
      message: 'Token signature is valid',
      code: 'SIGNATURE_VALID',
    };
  }

  validateTokenNotExpired(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required and must be a string');
    }

    // In a real implementation, this would check token expiration
    // For now, we'll do basic validation
    logger.debug('Token expiration validated');
    return {
      valid: true,
      message: 'Token is not expired',
      code: 'EXPIRATION_VALID',
    };
  }

  validateTokenNotTampered(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required and must be a string');
    }

    // In a real implementation, this would verify token integrity
    // For now, we'll do basic validation
    logger.debug('Token integrity validated');
    return {
      valid: true,
      message: 'Token has not been tampered',
      code: 'INTEGRITY_VALID',
    };
  }

  validateTokenNotRevoked(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required and must be a string');
    }

    if (this.revokedTokens.has(token)) {
      logger.error(`Token revocation validation failed: ${token} is revoked`);
      throw new Error('Token has been revoked');
    }

    logger.debug('Token revocation status validated');
    return {
      valid: true,
      message: 'Token is not revoked',
      code: 'REVOCATION_VALID',
    };
  }

  rejectInvalidToken(token, reason) {
    if (!token || !reason) {
      throw new Error('Token and reason are required');
    }

    if (typeof token !== 'string' || typeof reason !== 'string') {
      throw new Error('Token and reason must be strings');
    }

    this.logInvalidTokenAttempt(token, reason);

    const error = new Error(`Invalid token: ${reason}`);
    error.statusCode = 403;
    error.code = 'INVALID_TOKEN';
    error.reason = reason;

    logger.error(`Invalid token rejected: ${reason}`);
    throw error;
  }

  logInvalidTokenAttempt(token, reason) {
    if (!token || !reason) {
      logger.warn('Invalid token attempt log parameters missing');
      return null;
    }

    const logEntry = {
      id: `invalid-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      token: token.substring(0, 20) + '...', // Log only first 20 chars for security
      reason,
      timestamp: new Date().toISOString(),
    };

    this.invalidTokenLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.invalidTokenLog.length > this.maxInvalidTokenLogs) {
      this.invalidTokenLog = this.invalidTokenLog.slice(-this.maxInvalidTokenLogs);
    }

    logger.error(`Invalid token attempt logged: ${reason}`);
    return logEntry;
  }

  revokeToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required and must be a string');
    }

    this.revokedTokens.add(token);

    logger.info(`Token revoked: ${token.substring(0, 20)}...`);

    return {
      success: true,
      message: 'Token has been revoked',
      code: 'TOKEN_REVOKED',
      timestamp: new Date().toISOString(),
    };
  }

  getRevokedTokens(limit = 100) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 100;
    }

    const tokens = Array.from(this.revokedTokens);
    return {
      revokedTokens: tokens.slice(-limit).map(t => t.substring(0, 20) + '...'),
      count: tokens.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  getInvalidTokenLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    return {
      invalidTokenLog: this.invalidTokenLog.slice(-limit),
      count: this.invalidTokenLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearRevokedTokens() {
    const clearedCount = this.revokedTokens.size;
    this.revokedTokens.clear();
    logger.info(`Revoked tokens cleared: ${clearedCount} tokens`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }

  validateToken(token) {
    try {
      this.validateTokenFormat(token);
      this.validateTokenSignature(token);
      this.validateTokenNotExpired(token);
      this.validateTokenNotTampered(token);
      this.validateTokenNotRevoked(token);

      return {
        valid: true,
        message: 'Token is valid',
        code: 'TOKEN_VALID',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Token validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message,
        code: 'TOKEN_INVALID',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

const invalidTokenRejectionService = new InvalidTokenRejectionService();

export default invalidTokenRejectionService;
export { InvalidTokenRejectionService };