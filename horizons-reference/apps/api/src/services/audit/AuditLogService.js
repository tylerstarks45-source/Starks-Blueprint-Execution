import 'dotenv/config';
import AuditLogStorageService from './AuditLogStorageService.js';
import logger from '../../utils/logger.js';

class AuditLogService {
  constructor() {
    this.storageService = AuditLogStorageService;
    this.deduplicationCache = new Map();
    this.maxCacheSize = 1000;
    this.deduplicationWindowMs = 5000; // 5 seconds
    this.initialized = true;
    logger.info('Audit Log Service initialized');
  }

  logAdminAction(userId, action, details = {}) {
    if (!userId || !action) {
      logger.warn('Invalid admin action log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof action !== 'string') {
      logger.warn('Admin action parameters must be strings');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(userId, action, 'admin-action')) {
      logger.debug(`Duplicate admin action skipped: ${userId} - ${action}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'admin-action',
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
      severity: 'medium',
    };

    this.storageService.storeAuditLog(logEntry);
    logger.info(`Admin action logged: ${userId} - ${action}`);
    return logEntry;
  }

  logLoginAttempt(email, success, reason = '') {
    if (!email || typeof email !== 'string' || typeof success !== 'boolean') {
      logger.warn('Invalid login attempt log parameters');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(email, 'login-attempt', 'auth')) {
      logger.debug(`Duplicate login attempt skipped: ${email}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'login-attempt',
      email,
      success,
      reason,
      timestamp: new Date().toISOString(),
      severity: success ? 'low' : 'medium',
    };

    this.storageService.storeAuditLog(logEntry);
    const status = success ? 'successful' : 'failed';
    logger.info(`Login attempt logged: ${email} - ${status}${reason ? ` (${reason})` : ''}`);
    return logEntry;
  }

  logFailedRequest(userId, endpoint, reason = '') {
    if (!userId || !endpoint) {
      logger.warn('Invalid failed request log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof endpoint !== 'string') {
      logger.warn('Failed request parameters must be strings');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(userId, endpoint, 'failed-request')) {
      logger.debug(`Duplicate failed request skipped: ${userId} - ${endpoint}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'failed-request',
      userId,
      endpoint,
      reason,
      timestamp: new Date().toISOString(),
      severity: 'medium',
    };

    this.storageService.storeAuditLog(logEntry);
    logger.warn(`Failed request logged: ${userId} on ${endpoint}${reason ? ` (${reason})` : ''}`);
    return logEntry;
  }

  logSuspiciousActivity(userId, activity, details = {}, severity = 'medium') {
    if (!userId || !activity) {
      logger.warn('Invalid suspicious activity log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof activity !== 'string') {
      logger.warn('Suspicious activity parameters must be strings');
      return null;
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      severity = 'medium';
    }

    // Check for deduplication
    if (this.isDuplicate(userId, activity, 'suspicious-activity')) {
      logger.debug(`Duplicate suspicious activity skipped: ${userId} - ${activity}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'suspicious-activity',
      userId,
      activity,
      details,
      severity,
      timestamp: new Date().toISOString(),
    };

    this.storageService.storeAuditLog(logEntry);
    logger.warn(`Suspicious activity logged: ${userId} - ${activity} (severity: ${severity})`);
    return logEntry;
  }

  logPermissionViolation(userId, resource, action) {
    if (!userId || !resource || !action) {
      logger.warn('Invalid permission violation log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof resource !== 'string' || typeof action !== 'string') {
      logger.warn('Permission violation parameters must be strings');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(userId, `${resource}-${action}`, 'permission-violation')) {
      logger.debug(`Duplicate permission violation skipped: ${userId} - ${resource} ${action}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'permission-violation',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
      severity: 'high',
    };

    this.storageService.storeAuditLog(logEntry);
    logger.error(`Permission violation logged: ${userId} attempted ${action} on ${resource}`);
    return logEntry;
  }

  logAPIAbuse(userId, endpoint, reason = '') {
    if (!userId || !endpoint) {
      logger.warn('Invalid API abuse log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof endpoint !== 'string') {
      logger.warn('API abuse parameters must be strings');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(userId, endpoint, 'api-abuse')) {
      logger.debug(`Duplicate API abuse skipped: ${userId} - ${endpoint}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'api-abuse',
      userId,
      endpoint,
      reason,
      timestamp: new Date().toISOString(),
      severity: 'high',
    };

    this.storageService.storeAuditLog(logEntry);
    logger.error(`API abuse logged: ${userId} on ${endpoint}${reason ? ` (${reason})` : ''}`);
    return logEntry;
  }

  logSessionEvent(userId, event, details = {}) {
    if (!userId || !event) {
      logger.warn('Invalid session event log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof event !== 'string') {
      logger.warn('Session event parameters must be strings');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(userId, event, 'session-event')) {
      logger.debug(`Duplicate session event skipped: ${userId} - ${event}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'session-event',
      userId,
      event,
      details,
      timestamp: new Date().toISOString(),
      severity: 'low',
    };

    this.storageService.storeAuditLog(logEntry);
    logger.info(`Session event logged: ${userId} - ${event}`);
    return logEntry;
  }

  logRoleChange(userId, oldRole, newRole, changedBy) {
    if (!userId || !oldRole || !newRole || !changedBy) {
      logger.warn('Invalid role change log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof oldRole !== 'string' || typeof newRole !== 'string' || typeof changedBy !== 'string') {
      logger.warn('Role change parameters must be strings');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(userId, `${oldRole}-${newRole}`, 'role-change')) {
      logger.debug(`Duplicate role change skipped: ${userId} - ${oldRole} -> ${newRole}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'role-change',
      userId,
      oldRole,
      newRole,
      changedBy,
      timestamp: new Date().toISOString(),
      severity: 'high',
    };

    this.storageService.storeAuditLog(logEntry);
    logger.warn(`Role change logged: ${userId} - ${oldRole} -> ${newRole} (by ${changedBy})`);
    return logEntry;
  }

  logResourceAccess(userId, resource, action) {
    if (!userId || !resource || !action) {
      logger.warn('Invalid resource access log parameters');
      return null;
    }

    if (typeof userId !== 'string' || typeof resource !== 'string' || typeof action !== 'string') {
      logger.warn('Resource access parameters must be strings');
      return null;
    }

    // Check for deduplication
    if (this.isDuplicate(userId, `${resource}-${action}`, 'resource-access')) {
      logger.debug(`Duplicate resource access skipped: ${userId} - ${resource} ${action}`);
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'resource-access',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
      severity: 'low',
    };

    this.storageService.storeAuditLog(logEntry);
    logger.debug(`Resource access logged: ${userId} - ${action} on ${resource}`);
    return logEntry;
  }

  getAuditLog(filters = {}) {
    if (typeof filters !== 'object' || filters === null) {
      logger.warn('Invalid audit log filters');
      return {
        logs: [],
        count: 0,
        filters: {},
        timestamp: new Date().toISOString(),
      };
    }

    const logs = this.storageService.retrieveAuditLogs(filters);

    return {
      logs,
      count: logs.length,
      filters,
      timestamp: new Date().toISOString(),
    };
  }

  isDuplicate(key1, key2, type) {
    const cacheKey = `${key1}-${key2}-${type}`;
    const now = Date.now();

    // Check if entry exists and is within deduplication window
    if (this.deduplicationCache.has(cacheKey)) {
      const cachedTime = this.deduplicationCache.get(cacheKey);
      if (now - cachedTime < this.deduplicationWindowMs) {
        return true; // Duplicate
      }
    }

    // Store or update cache entry
    this.deduplicationCache.set(cacheKey, now);

    // Cleanup old cache entries if size exceeds limit
    if (this.deduplicationCache.size > this.maxCacheSize) {
      const oldestKey = this.deduplicationCache.keys().next().value;
      this.deduplicationCache.delete(oldestKey);
    }

    return false; // Not a duplicate
  }

  getServiceStatus() {
    return {
      initialized: this.initialized,
      storageStatus: this.storageService.getAuditLogStats(),
      deduplicationCacheSize: this.deduplicationCache.size,
      timestamp: new Date().toISOString(),
    };
  }
}

const auditLogService = new AuditLogService();

export default auditLogService;
export { AuditLogService };