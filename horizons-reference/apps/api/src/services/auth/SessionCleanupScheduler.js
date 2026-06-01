import 'dotenv/config';
import logger from '../../utils/logger.js';
import enhancedSessionManagementService from './EnhancedSessionManagementService.js';

class SessionCleanupScheduler {
  constructor() {
    this.scheduler = null;
    this.cleanupInterval = 30 * 60 * 1000; // 30 minutes
    this.lastCleanupTime = null;
    this.cleanupCount = 0;
    this.sessionsRemovedTotal = 0;
    this.initialized = true;
    logger.info('Session Cleanup Scheduler initialized');
  }

  startSessionCleanupScheduler() {
    if (this.scheduler) {
      logger.warn('Session cleanup scheduler is already running');
      return {
        success: false,
        message: 'Scheduler is already running',
        code: 'SCHEDULER_ALREADY_RUNNING',
      };
    }

    // Start cleanup scheduler
    this.scheduler = setInterval(() => {
      this.runSessionCleanup();
    }, this.cleanupInterval);

    logger.info(`Session cleanup scheduler started (interval: ${this.cleanupInterval}ms)`);

    return {
      success: true,
      message: 'Session cleanup scheduler started',
      code: 'SCHEDULER_STARTED',
      interval: this.cleanupInterval,
      intervalMinutes: Math.round(this.cleanupInterval / 60000),
      timestamp: new Date().toISOString(),
    };
  }

  stopSessionCleanupScheduler() {
    if (!this.scheduler) {
      logger.warn('Session cleanup scheduler is not running');
      return {
        success: false,
        message: 'Scheduler is not running',
        code: 'SCHEDULER_NOT_RUNNING',
      };
    }

    clearInterval(this.scheduler);
    this.scheduler = null;

    logger.info('Session cleanup scheduler stopped');

    return {
      success: true,
      message: 'Session cleanup scheduler stopped',
      code: 'SCHEDULER_STOPPED',
      timestamp: new Date().toISOString(),
    };
  }

  runSessionCleanup() {
    try {
      const startTime = Date.now();

      // Get stats before cleanup
      const statsBefore = enhancedSessionManagementService.getSessionStats();

      // Run cleanup
      const result = enhancedSessionManagementService.cleanupExpiredSessions();

      // Get stats after cleanup
      const statsAfter = enhancedSessionManagementService.getSessionStats();

      const duration = Date.now() - startTime;

      this.lastCleanupTime = new Date().toISOString();
      this.cleanupCount += 1;
      this.sessionsRemovedTotal += result.clearedCount;

      this.logCleanupEvent('SESSION_CLEANUP_COMPLETED', {
        sessionsRemoved: result.clearedCount,
        sessionsBefore: statsBefore.totalSessions,
        sessionsAfter: statsAfter.totalSessions,
        duration,
      });

      logger.info(`Session cleanup completed: ${result.clearedCount} sessions removed (${duration}ms)`);

      return {
        success: true,
        message: 'Session cleanup completed',
        code: 'CLEANUP_COMPLETED',
        sessionsRemoved: result.clearedCount,
        sessionsBefore: statsBefore.totalSessions,
        sessionsAfter: statsAfter.totalSessions,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Session cleanup error: ${error.message}`);
      this.logCleanupEvent('SESSION_CLEANUP_FAILED', {
        error: error.message,
      });
      throw error;
    }
  }

  getCleanupStatus() {
    const stats = enhancedSessionManagementService.getSessionStats();
    const nextCleanupTime = this.lastCleanupTime
      ? new Date(new Date(this.lastCleanupTime).getTime() + this.cleanupInterval).toISOString()
      : 'pending';

    return {
      schedulerRunning: this.scheduler !== null,
      lastCleanupTime: this.lastCleanupTime,
      nextCleanupTime,
      cleanupCount: this.cleanupCount,
      sessionsRemovedTotal: this.sessionsRemovedTotal,
      currentSessionStats: stats,
      interval: this.cleanupInterval,
      intervalMinutes: Math.round(this.cleanupInterval / 60000),
      timestamp: new Date().toISOString(),
    };
  }

  logCleanupEvent(event, details = {}) {
    if (!event || typeof event !== 'string') {
      logger.warn('Invalid cleanup event log parameters');
      return null;
    }

    const logEntry = {
      event,
      details,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Cleanup event: ${event}`);
    return logEntry;
  }
}

const sessionCleanupScheduler = new SessionCleanupScheduler();

// Auto-start scheduler on initialization
if (process.env.AUTO_START_SESSION_CLEANUP !== 'false') {
  sessionCleanupScheduler.startSessionCleanupScheduler();
}

export default sessionCleanupScheduler;
export { SessionCleanupScheduler };