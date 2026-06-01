import 'dotenv/config';
import logger from '../../utils/logger.js';
import enhancedSessionManagementService from './EnhancedSessionManagementService.js';

class SessionExpirationService {
  constructor() {
    this.sessionExpirationMs = 24 * 60 * 60 * 1000; // 24 hours
    this.expirationWarningMs = 15 * 60 * 1000; // 15 minutes before expiration
    this.initialized = true;
    logger.info('Session Expiration Service initialized');
  }

  getSessionExpiration(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    const metadata = enhancedSessionManagementService.getSessionMetadata(sessionToken);

    return {
      sessionToken,
      expiresAt: metadata.expiresAt,
      expirationTime: new Date(metadata.expiresAt).getTime(),
      timestamp: new Date().toISOString(),
    };
  }

  isSessionExpired(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      return true;
    }

    try {
      const metadata = enhancedSessionManagementService.getSessionMetadata(sessionToken);
      const now = Date.now();
      const expiresAt = new Date(metadata.expiresAt).getTime();

      return now > expiresAt;
    } catch (error) {
      return true;
    }
  }

  getSessionTimeRemaining(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    const metadata = enhancedSessionManagementService.getSessionMetadata(sessionToken);
    const now = Date.now();
    const expiresAt = new Date(metadata.expiresAt).getTime();
    const timeRemaining = Math.max(0, expiresAt - now);

    return {
      sessionToken,
      timeRemaining,
      timeRemainingMinutes: Math.round(timeRemaining / 60000),
      expiresAt: metadata.expiresAt,
      timestamp: new Date().toISOString(),
    };
  }

  extendSessionExpiration(sessionToken, additionalTime) {
    if (!sessionToken || typeof additionalTime !== 'number') {
      throw new Error('Session token and additional time (in milliseconds) are required');
    }

    if (additionalTime <= 0) {
      throw new Error('Additional time must be positive');
    }

    // Note: Extension should only happen after re-authentication
    // This is a placeholder - actual implementation would require re-auth
    logger.warn(`Session extension requested: ${sessionToken} (${additionalTime}ms) - requires re-authentication`);

    return {
      sessionToken,
      message: 'Session extension requires re-authentication',
      code: 'REAUTH_REQUIRED',
      timestamp: new Date().toISOString(),
    };
  }

  enforceSessionExpiration(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    if (this.isSessionExpired(sessionToken)) {
      logger.warn(`Session expiration enforced: ${sessionToken} is expired`);
      throw new Error('Session has expired');
    }

    logger.debug(`Session expiration enforced: ${sessionToken} is valid`);
    return {
      valid: true,
      message: 'Session is not expired',
      code: 'EXPIRATION_ENFORCED',
      sessionToken,
    };
  }

  cleanupExpiredSessions() {
    const result = enhancedSessionManagementService.cleanupExpiredSessions();
    logger.info(`Expired sessions cleanup completed: ${result.clearedCount} sessions removed`);
    return result;
  }

  getExpirationWarningTime() {
    return {
      warningThreshold: this.expirationWarningMs,
      warningThresholdMinutes: Math.round(this.expirationWarningMs / 60000),
      description: 'Time before expiration when warning is triggered',
      timestamp: new Date().toISOString(),
    };
  }

  warnSessionExpiring(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    try {
      const timeRemaining = this.getSessionTimeRemaining(sessionToken);

      if (timeRemaining.timeRemaining <= this.expirationWarningMs) {
        logger.warn(`Session expiration warning: ${sessionToken} expires in ${timeRemaining.timeRemainingMinutes} minutes`);
        return {
          warning: true,
          message: `Session expires in ${timeRemaining.timeRemainingMinutes} minutes`,
          sessionToken,
          timeRemaining: timeRemaining.timeRemaining,
          expiresAt: timeRemaining.expiresAt,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        warning: false,
        message: 'Session is not expiring soon',
        sessionToken,
        timeRemaining: timeRemaining.timeRemaining,
        expiresAt: timeRemaining.expiresAt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Session expiration warning check failed: ${error.message}`);
      throw error;
    }
  }

  getSessionLifetime() {
    return {
      defaultLifetime: this.sessionExpirationMs,
      defaultLifetimeHours: Math.round(this.sessionExpirationMs / (60 * 60 * 1000)),
      warningThreshold: this.expirationWarningMs,
      warningThresholdMinutes: Math.round(this.expirationWarningMs / 60000),
      timestamp: new Date().toISOString(),
    };
  }
}

const sessionExpirationService = new SessionExpirationService();

export default sessionExpirationService;
export { SessionExpirationService };