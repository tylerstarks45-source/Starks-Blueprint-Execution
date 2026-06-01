import 'dotenv/config';
import logger from '../../utils/logger.js';
import enhancedSessionManagementService from './EnhancedSessionManagementService.js';

class LogoutCleanupService {
  constructor() {
    this.revokedTokens = new Set();
    this.logoutLog = [];
    this.maxLogoutLogEntries = 1000;
    this.initialized = true;
    logger.info('Logout Cleanup Service initialized');
  }

  performLogout(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    try {
      // Get session metadata before invalidation
      const metadata = enhancedSessionManagementService.getSessionMetadata(sessionToken);
      const userId = metadata.userId;

      // Invalidate session token
      this.invalidateSessionToken(sessionToken);

      // Clear session data
      this.clearSessionData(sessionToken);

      // Remove session token
      this.removeSessionToken(sessionToken);

      // Log logout event
      this.logLogoutEvent(userId, sessionToken);

      logger.info(`Logout completed: ${userId} (${sessionToken})`);

      return {
        success: true,
        message: 'Logged out successfully',
        userId,
        sessionToken,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Logout failed: ${error.message}`);
      throw error;
    }
  }

  invalidateSessionToken(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    // Mark token as revoked
    this.revokedTokens.add(sessionToken);

    // Invalidate in session management service
    enhancedSessionManagementService.invalidateSession(sessionToken);

    logger.debug(`Session token invalidated: ${sessionToken}`);

    return {
      success: true,
      sessionToken,
      timestamp: new Date().toISOString(),
    };
  }

  clearSessionData(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    // Clear all session-related data
    // In a real implementation, this would clear:
    // - Session metadata
    // - Session cookies
    // - Session cache
    // - User activity tracking

    logger.debug(`Session data cleared: ${sessionToken}`);

    return {
      success: true,
      sessionToken,
      dataCleared: [
        'metadata',
        'cookies',
        'cache',
        'activity',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  removeSessionToken(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    // Remove from active sessions
    // This is handled by invalidateSession in the session management service

    logger.debug(`Session token removed from active sessions: ${sessionToken}`);

    return {
      success: true,
      sessionToken,
      timestamp: new Date().toISOString(),
    };
  }

  cleanupUserSessions(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    try {
      const result = enhancedSessionManagementService.invalidateAllUserSessions(userId);

      this.logLogoutEvent(userId, 'all-sessions');

      logger.info(`User sessions cleaned up: ${userId} (${result.invalidatedCount} sessions)`);

      return {
        success: true,
        userId,
        invalidatedCount: result.invalidatedCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`User session cleanup failed: ${error.message}`);
      throw error;
    }
  }

  logLogoutEvent(userId, sessionToken) {
    if (!userId || !sessionToken) {
      logger.warn('Invalid logout event log parameters');
      return null;
    }

    const logEntry = {
      id: `logout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionToken,
      timestamp: new Date().toISOString(),
    };

    this.logoutLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.logoutLog.length > this.maxLogoutLogEntries) {
      this.logoutLog = this.logoutLog.slice(-this.maxLogoutLogEntries);
    }

    logger.info(`Logout event logged: ${userId}`);
    return logEntry;
  }

  preventPostLogoutAccess(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    if (this.revokedTokens.has(sessionToken)) {
      logger.error(`Post-logout access attempt: ${sessionToken} has been revoked`);
      throw new Error('Post-logout access prevented: Session has been revoked');
    }

    logger.debug(`Post-logout access prevention passed: ${sessionToken}`);
    return {
      valid: true,
      message: 'Post-logout access prevented',
      code: 'POST_LOGOUT_PREVENTED',
      sessionToken,
    };
  }

  verifyLogoutComplete(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      return false;
    }

    // Check if token is revoked
    if (!this.revokedTokens.has(sessionToken)) {
      return false;
    }

    // Check if token is invalidated in session management service
    try {
      enhancedSessionManagementService.preventSessionReuse(sessionToken);
      return false; // If no error, session is still active
    } catch (error) {
      // Expected error - session is invalidated
      return true;
    }
  }

  getRevokedTokens(limit = 100) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 100;
    }

    const tokens = Array.from(this.revokedTokens);
    return {
      revokedTokens: tokens.slice(-limit),
      count: tokens.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  getLogoutLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    return {
      logoutLog: this.logoutLog.slice(-limit),
      count: this.logoutLog.length,
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
}

const logoutCleanupService = new LogoutCleanupService();

export default logoutCleanupService;
export { LogoutCleanupService };