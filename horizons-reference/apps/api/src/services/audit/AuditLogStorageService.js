import 'dotenv/config';
import logger from '../../utils/logger.js';

class AuditLogStorageService {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000; // Circular buffer limit
    this.logIndex = new Map(); // userId -> [logIds]
    this.actionIndex = new Map(); // action -> [logIds]
    this.initialized = true;
    logger.info('Audit Log Storage Service initialized');
  }

  storeAuditLog(logEntry) {
    if (!logEntry || typeof logEntry !== 'object') {
      logger.warn('Invalid audit log entry');
      return null;
    }

    if (!logEntry.id || !logEntry.timestamp) {
      logger.warn('Audit log entry missing required fields');
      return null;
    }

    // Add to logs array
    this.logs.push(logEntry);

    // Maintain circular buffer - remove oldest if exceeds max
    if (this.logs.length > this.maxLogs) {
      const removedLog = this.logs.shift();
      this.removeFromIndices(removedLog);
    }

    // Update indices
    if (logEntry.userId) {
      if (!this.logIndex.has(logEntry.userId)) {
        this.logIndex.set(logEntry.userId, []);
      }
      this.logIndex.get(logEntry.userId).push(logEntry.id);
    }

    if (logEntry.action) {
      if (!this.actionIndex.has(logEntry.action)) {
        this.actionIndex.set(logEntry.action, []);
      }
      this.actionIndex.get(logEntry.action).push(logEntry.id);
    }

    logger.debug(`Audit log stored: ${logEntry.id}`);
    return logEntry;
  }

  retrieveAuditLogs(filters = {}) {
    if (typeof filters !== 'object' || filters === null) {
      return this.logs.slice();
    }

    let results = this.logs.slice();

    // Filter by userId
    if (filters.userId && typeof filters.userId === 'string') {
      results = results.filter(log => log.userId === filters.userId);
    }

    // Filter by action
    if (filters.action && typeof filters.action === 'string') {
      results = results.filter(log => log.action === filters.action);
    }

    // Filter by type
    if (filters.type && typeof filters.type === 'string') {
      results = results.filter(log => log.type === filters.type);
    }

    // Filter by severity
    if (filters.severity && typeof filters.severity === 'string') {
      results = results.filter(log => log.severity === filters.severity);
    }

    // Filter by date range
    if (filters.startDate && filters.endDate) {
      const startTime = new Date(filters.startDate).getTime();
      const endTime = new Date(filters.endDate).getTime();

      if (!isNaN(startTime) && !isNaN(endTime)) {
        results = results.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          return logTime >= startTime && logTime <= endTime;
        });
      }
    }

    // Apply limit
    if (filters.limit && typeof filters.limit === 'number' && filters.limit > 0) {
      results = results.slice(-filters.limit);
    }

    return results;
  }

  retrieveAuditLogsByUser(userId) {
    if (!userId || typeof userId !== 'string') {
      logger.warn('Invalid user ID for audit log retrieval');
      return [];
    }

    return this.logs.filter(log => log.userId === userId);
  }

  retrieveAuditLogsByAction(action) {
    if (!action || typeof action !== 'string') {
      logger.warn('Invalid action for audit log retrieval');
      return [];
    }

    return this.logs.filter(log => log.action === action);
  }

  retrieveAuditLogsByDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      logger.warn('Invalid date range for audit log retrieval');
      return [];
    }

    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();

    if (isNaN(startTime) || isNaN(endTime)) {
      logger.warn('Invalid date format for audit log retrieval');
      return [];
    }

    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= startTime && logTime <= endTime;
    });
  }

  clearOldAuditLogs(daysOld = 30) {
    if (typeof daysOld !== 'number' || daysOld < 1) {
      logger.warn('Invalid daysOld parameter for audit log cleanup');
      return {
        success: false,
        clearedCount: 0,
        error: 'Invalid daysOld parameter',
      };
    }

    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const initialCount = this.logs.length;

    // Filter out old logs
    this.logs = this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= cutoffTime;
    });

    const clearedCount = initialCount - this.logs.length;

    // Rebuild indices
    this.rebuildIndices();

    logger.info(`Cleared ${clearedCount} audit logs older than ${daysOld} days`);

    return {
      success: true,
      clearedCount,
      remainingCount: this.logs.length,
      timestamp: new Date().toISOString(),
    };
  }

  getAuditLogCount() {
    return {
      total: this.logs.length,
      maxCapacity: this.maxLogs,
      utilizationPercent: Math.round((this.logs.length / this.maxLogs) * 100),
      timestamp: new Date().toISOString(),
    };
  }

  getAuditLogStats() {
    const stats = {
      total: this.logs.length,
      maxCapacity: this.maxLogs,
      utilizationPercent: Math.round((this.logs.length / this.maxLogs) * 100),
      byType: {},
      bySeverity: {},
      byUser: {},
      byAction: {},
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : null,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
      timestamp: new Date().toISOString(),
    };

    // Count by type
    this.logs.forEach(log => {
      const type = log.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      const severity = log.severity || 'unknown';
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      }

      if (log.action) {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      }
    });

    return stats;
  }

  removeFromIndices(logEntry) {
    if (!logEntry) return;

    if (logEntry.userId && this.logIndex.has(logEntry.userId)) {
      const userLogs = this.logIndex.get(logEntry.userId);
      const index = userLogs.indexOf(logEntry.id);
      if (index > -1) {
        userLogs.splice(index, 1);
      }
      if (userLogs.length === 0) {
        this.logIndex.delete(logEntry.userId);
      }
    }

    if (logEntry.action && this.actionIndex.has(logEntry.action)) {
      const actionLogs = this.actionIndex.get(logEntry.action);
      const index = actionLogs.indexOf(logEntry.id);
      if (index > -1) {
        actionLogs.splice(index, 1);
      }
      if (actionLogs.length === 0) {
        this.actionIndex.delete(logEntry.action);
      }
    }
  }

  rebuildIndices() {
    this.logIndex.clear();
    this.actionIndex.clear();

    this.logs.forEach(log => {
      if (log.userId) {
        if (!this.logIndex.has(log.userId)) {
          this.logIndex.set(log.userId, []);
        }
        this.logIndex.get(log.userId).push(log.id);
      }

      if (log.action) {
        if (!this.actionIndex.has(log.action)) {
          this.actionIndex.set(log.action, []);
        }
        this.actionIndex.get(log.action).push(log.id);
      }
    });
  }

  clearAllLogs() {
    const clearedCount = this.logs.length;
    this.logs = [];
    this.logIndex.clear();
    this.actionIndex.clear();
    logger.warn(`All audit logs cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const auditLogStorageService = new AuditLogStorageService();

export default auditLogStorageService;
export { AuditLogStorageService };