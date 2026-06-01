import 'dotenv/config';
import rateLimitConfig from '../../config/rateLimitConfig.js';
import logger from '../../utils/logger.js';

class AuthRequestProtectionService {
  constructor() {
    this.authAttempts = new Map(); // email -> { count, resetTime, lockedUntil }
    this.attemptLog = [];
    this.maxAttemptLogs = 1000;
    this.initialized = true;
    logger.info('Auth Request Protection Service initialized');
  }

  checkAuthRateLimit(email, authType = 'login') {
    if (!email || typeof email !== 'string') {
      return {
        allowed: false,
        error: 'Email is required and must be a string',
        code: 'INVALID_EMAIL',
      };
    }

    const limit = rateLimitConfig.getAuthLimit(authType);
    const now = Date.now();

    // Get or initialize email's attempt tracking
    if (!this.authAttempts.has(email)) {
      this.authAttempts.set(email, {
        count: 0,
        resetTime: now + limit.windowMs,
        lockedUntil: null,
      });
    }

    const attemptData = this.authAttempts.get(email);

    // Check if account is locked
    if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
      const minutesRemaining = Math.ceil((attemptData.lockedUntil - now) / 60000);
      logger.warn(`Auth account locked: ${email} (${minutesRemaining} minutes remaining)`);
      this.logAuthAttempt(email, false, 'account-locked');

      return {
        allowed: false,
        error: `Account is locked. Try again in ${minutesRemaining} minutes.`,
        code: 'ACCOUNT_LOCKED',
        lockedUntil: new Date(attemptData.lockedUntil).toISOString(),
        lockedUntilMs: attemptData.lockedUntil,
        minutesRemaining,
        timestamp: new Date().toISOString(),
      };
    }

    // Reset if window has expired
    if (now >= attemptData.resetTime) {
      attemptData.count = 0;
      attemptData.resetTime = now + limit.windowMs;
      attemptData.lockedUntil = null;
    }

    const attemptsRemaining = Math.max(0, limit.maxAttempts - attemptData.count);
    const allowed = attemptData.count < limit.maxAttempts;

    if (!allowed) {
      logger.warn(`Auth rate limit exceeded: ${email} (${attemptData.count}/${limit.maxAttempts})`);
      this.logAuthAttempt(email, false, 'rate-limit-exceeded');
    }

    return {
      allowed,
      attemptsRemaining,
      resetTime: new Date(attemptData.resetTime).toISOString(),
      resetTimeMs: attemptData.resetTime,
      maxAttempts: limit.maxAttempts,
      code: allowed ? 'AUTH_LIMIT_OK' : 'AUTH_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
    };
  }

  incrementAuthAttempt(email, authType = 'login') {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    const limit = rateLimitConfig.getAuthLimit(authType);
    const now = Date.now();

    if (!this.authAttempts.has(email)) {
      this.authAttempts.set(email, {
        count: 0,
        resetTime: now + limit.windowMs,
        lockedUntil: null,
      });
    }

    const attemptData = this.authAttempts.get(email);

    // Reset if window has expired
    if (now >= attemptData.resetTime) {
      attemptData.count = 0;
      attemptData.resetTime = now + limit.windowMs;
      attemptData.lockedUntil = null;
    }

    attemptData.count += 1;

    // Lock account if max attempts exceeded
    if (attemptData.count >= limit.maxAttempts) {
      attemptData.lockedUntil = now + limit.lockoutDurationMs;
      logger.warn(`Auth account locked: ${email} (${limit.maxAttempts} attempts exceeded)`);
    }

    const attemptsRemaining = Math.max(0, limit.maxAttempts - attemptData.count);

    logger.debug(`Auth attempt incremented: ${email} (${attemptData.count}/${limit.maxAttempts})`);

    return {
      count: attemptData.count,
      attemptsRemaining,
      resetTime: new Date(attemptData.resetTime).toISOString(),
      resetTimeMs: attemptData.resetTime,
      maxAttempts: limit.maxAttempts,
      locked: attemptData.lockedUntil !== null && now < attemptData.lockedUntil,
      lockedUntil: attemptData.lockedUntil ? new Date(attemptData.lockedUntil).toISOString() : null,
      timestamp: new Date().toISOString(),
    };
  }

  getAuthAttemptsRemaining(email, authType = 'login') {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    const limit = rateLimitConfig.getAuthLimit(authType);
    const now = Date.now();

    if (!this.authAttempts.has(email)) {
      return {
        email,
        attemptsRemaining: limit.maxAttempts,
        maxAttempts: limit.maxAttempts,
        locked: false,
        timestamp: new Date().toISOString(),
      };
    }

    const attemptData = this.authAttempts.get(email);

    // Check if locked
    const locked = attemptData.lockedUntil && now < attemptData.lockedUntil;

    // Reset if window has expired
    if (now >= attemptData.resetTime) {
      return {
        email,
        attemptsRemaining: limit.maxAttempts,
        maxAttempts: limit.maxAttempts,
        locked: false,
        timestamp: new Date().toISOString(),
      };
    }

    const attemptsRemaining = Math.max(0, limit.maxAttempts - attemptData.count);

    return {
      email,
      attemptsRemaining,
      maxAttempts: limit.maxAttempts,
      locked,
      lockedUntil: locked ? new Date(attemptData.lockedUntil).toISOString() : null,
      resetTime: new Date(attemptData.resetTime).toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  lockoutAccount(email, durationMs) {
    if (!email || typeof email !== 'string' || typeof durationMs !== 'number') {
      throw new Error('Email (string) and duration in milliseconds (number) are required');
    }

    if (durationMs <= 0) {
      throw new Error('Duration must be positive');
    }

    const now = Date.now();

    if (!this.authAttempts.has(email)) {
      this.authAttempts.set(email, {
        count: 0,
        resetTime: now + 60 * 60 * 1000,
        lockedUntil: null,
      });
    }

    const attemptData = this.authAttempts.get(email);
    attemptData.lockedUntil = now + durationMs;

    logger.warn(`Auth account locked manually: ${email} (${Math.round(durationMs / 60000)} minutes)`);
    this.logAuthAttempt(email, false, 'manual-lockout');

    return {
      success: true,
      email,
      lockedUntil: new Date(attemptData.lockedUntil).toISOString(),
      durationMinutes: Math.round(durationMs / 60000),
      timestamp: new Date().toISOString(),
    };
  }

  isAccountLockedOut(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    const now = Date.now();

    if (!this.authAttempts.has(email)) {
      return {
        email,
        locked: false,
        timestamp: new Date().toISOString(),
      };
    }

    const attemptData = this.authAttempts.get(email);
    const locked = attemptData.lockedUntil && now < attemptData.lockedUntil;

    return {
      email,
      locked,
      lockedUntil: locked ? new Date(attemptData.lockedUntil).toISOString() : null,
      minutesRemaining: locked ? Math.ceil((attemptData.lockedUntil - now) / 60000) : 0,
      timestamp: new Date().toISOString(),
    };
  }

  resetAuthAttempts(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    const now = Date.now();

    if (!this.authAttempts.has(email)) {
      return {
        success: false,
        error: 'Email not found in auth tracking',
        code: 'EMAIL_NOT_FOUND',
      };
    }

    const attemptData = this.authAttempts.get(email);
    attemptData.count = 0;
    attemptData.resetTime = now + 15 * 60 * 1000; // Default 15 minutes
    attemptData.lockedUntil = null;

    logger.info(`Auth attempts reset: ${email}`);
    this.logAuthAttempt(email, true, 'reset-after-success');

    return {
      success: true,
      email,
      timestamp: new Date().toISOString(),
    };
  }

  logAuthAttempt(email, success, reason = '') {
    if (!email || typeof email !== 'string' || typeof success !== 'boolean') {
      logger.warn('Invalid auth attempt log parameters');
      return null;
    }

    const attempt = {
      id: `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      success,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.attemptLog.push(attempt);

    // Keep only last 1000 attempts
    if (this.attemptLog.length > this.maxAttemptLogs) {
      this.attemptLog = this.attemptLog.slice(-this.maxAttemptLogs);
    }

    const status = success ? 'successful' : 'failed';
    logger.info(`Auth attempt logged: ${email} - ${status}${reason ? ` (${reason})` : ''}`);
    return attempt;
  }

  getAttemptLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    return {
      attempts: this.attemptLog.slice(-limit),
      count: this.attemptLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearAttemptLog() {
    const clearedCount = this.attemptLog.length;
    this.attemptLog = [];
    logger.info(`Auth attempt log cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }

  getServiceStatus() {
    return {
      initialized: this.initialized,
      trackedEmails: this.authAttempts.size,
      attemptLogSize: this.attemptLog.length,
      timestamp: new Date().toISOString(),
    };
  }

  cleanupExpiredLockouts() {
    const now = Date.now();
    let clearedCount = 0;

    for (const [email, attemptData] of this.authAttempts.entries()) {
      // Clear expired lockouts
      if (attemptData.lockedUntil && now >= attemptData.lockedUntil) {
        attemptData.lockedUntil = null;
        clearedCount += 1;
      }

      // Clear expired windows
      if (now >= attemptData.resetTime && !attemptData.lockedUntil) {
        this.authAttempts.delete(email);
        clearedCount += 1;
      }
    }

    if (clearedCount > 0) {
      logger.debug(`Cleaned up ${clearedCount} expired auth lockouts`);
    }

    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const authRequestProtectionService = new AuthRequestProtectionService();

export default authRequestProtectionService;
export { AuthRequestProtectionService };