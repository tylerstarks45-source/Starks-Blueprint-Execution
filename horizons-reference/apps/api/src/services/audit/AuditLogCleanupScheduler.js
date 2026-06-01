import 'dotenv/config';
import AuditLogStorageService from './AuditLogStorageService.js';
import logger from '../../utils/logger.js';

class AuditLogCleanupScheduler {
  constructor() {
    this.scheduler = null;
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour default
    this.lastCleanupTime = null;
    this.cleanupCount = 0;
    this.logsRemovedTotal = 0;
    this.initialized = true;
    logger.info('Audit Log Cleanup Scheduler initialized');
  }

  startAuditLogCleanupScheduler(intervalMs = 60 * 60 * 1000) {
    if (this.scheduler) {
      logger.warn('Audit log cleanup scheduler is already running');
      return {
        success: false,
        message: 'Scheduler is already running',
        code: 'SCHEDULER_ALREADY_RUNNING',
      };
    }

    if (typeof intervalMs !== 'number' || intervalMs < 60000) {
      logger.warn('Invalid cleanup interval, using default 1 hour');
      intervalMs = 60 * 60 * 1000;
    }

    this.cleanupInterval = intervalMs;

    // Start cleanup scheduler
    this.scheduler = setInterval(() => {
      this.runAuditLogCleanup();
    }, this.cleanupInterval);

    logger.info(`Audit log cleanup scheduler started (interval: ${Math.round(intervalMs / 60000)} minutes)`);

    return {
      success: true,
      message: 'Audit log cleanup scheduler started',
      code: 'SCHEDULER_STARTED',
      interval: this.cleanupInterval,
      intervalMinutes: Math.round(this.cleanupInterval / 60000),
      timestamp: new Date().toISOString(),
    };
  }

  stopAuditLogCleanupScheduler() {
    if (!this.scheduler) {
      logger.warn('Audit log cleanup scheduler is not running');
      return {
        success: false,
        message: 'Scheduler is not running',
        code: 'SCHEDULER_NOT_RUNNING',
      };
    }

    clearInterval(this.scheduler);
    this.scheduler = null;

    logger.info('Audit log cleanup scheduler stopped');

    return {
      success: true,
      message: 'Audit log cleanup scheduler stopped',
      code: 'SCHEDULER_STOPPED',
      timestamp: new Date().toISOString(),
    };
  }

  runAuditLogCleanup(daysOld = 30) {
    try {
      if (typeof daysOld !== 'number' || daysOld < 1) {
        daysOld = 30;
      }

      const startTime = Date.now();

      // Run cleanup
      const result = AuditLogStorageService.clearOldAuditLogs(daysOld);

      const duration = Date.now() - startTime;

      this.lastCleanupTime = new Date().toISOString();
      this.cleanupCount += 1;
      this.logsRemovedTotal += result.clearedCount;

      this.logCleanupEvent('AUDIT_LOG_CLEANUP_COMPLETED', {
        logsRemoved: result.clearedCount,
        logsRemaining: result.remainingCount,
        daysOld,
        duration,
      });

      logger.info(`Audit log cleanup completed: ${result.clearedCount} logs removed (${duration}ms)`);

      return {
        success: true,
        message: 'Audit log cleanup completed',
        code: 'CLEANUP_COMPLETED',
        logsRemoved: result.clearedCount,
        logsRemaining: result.remainingCount,
        daysOld,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Audit log cleanup error: ${error.message}`);
      this.logCleanupEvent('AUDIT_LOG_CLEANUP_FAILED', {
        error: error.message,
      });
      throw error;
    }
  }

  getCleanupStatus() {
    const nextCleanupTime = this.lastCleanupTime
      ? new Date(new Date(this.lastCleanupTime).getTime() + this.cleanupInterval).toISOString()
      : 'pending';

    return {
      schedulerRunning: this.scheduler !== null,
      lastCleanupTime: this.lastCleanupTime,
      nextCleanupTime,
      cleanupCount: this.cleanupCount,
      logsRemovedTotal: this.logsRemovedTotal,
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

  gracefulShutdown() {
    logger.info('Graceful shutdown: stopping audit log cleanup scheduler');
    return this.stopAuditLogCleanupScheduler();
  }
}

const auditLogCleanupScheduler = new AuditLogCleanupScheduler();

export default auditLogCleanupScheduler;
export { AuditLogCleanupScheduler };