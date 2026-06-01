import 'dotenv/config';
import auditLogService from './AuditLogService.js';
import logger from '../../utils/logger.js';

class SuspiciousActivityDetectionService {
  constructor() {
    this.loginAttempts = new Map(); // email -> [timestamps]
    this.apiRequests = new Map(); // userId -> [timestamps]
    this.dataTransfers = new Map(); // userId -> [{ size, timestamp }]
    this.suspiciousActivityLog = [];
    this.maxActivityLogs = 1000;
    this.initialized = true;
    logger.info('Suspicious Activity Detection Service initialized');
  }

  detectMultipleFailedLogins(email, threshold = 5) {
    if (!email || typeof email !== 'string') {
      return {
        suspicious: false,
        error: 'Email is required and must be a string',
        code: 'INVALID_EMAIL',
      };
    }

    if (typeof threshold !== 'number' || threshold < 1) {
      threshold = 5;
    }

    const now = Date.now();
    const fifteenMinutesAgo = now - 15 * 60 * 1000;

    // Get or initialize login attempts
    if (!this.loginAttempts.has(email)) {
      return {
        suspicious: false,
        email,
        attempts: 0,
        threshold,
        code: 'NO_FAILED_LOGINS',
      };
    }

    const attempts = this.loginAttempts.get(email);
    const recentAttempts = attempts.filter(timestamp => timestamp > fifteenMinutesAgo);

    const suspicious = recentAttempts.length >= threshold;

    if (suspicious) {
      logger.warn(`Suspicious activity detected: Multiple failed logins for ${email} (${recentAttempts.length}/${threshold})`);
      auditLogService.logSuspiciousActivity(
        email,
        'multiple-failed-logins',
        {
          attempts: recentAttempts.length,
          threshold,
          timeWindow: '15 minutes',
        },
        'high'
      );
    }

    return {
      suspicious,
      email,
      attempts: recentAttempts.length,
      threshold,
      code: suspicious ? 'BRUTE_FORCE_DETECTED' : 'NORMAL_ACTIVITY',
      timestamp: new Date().toISOString(),
    };
  }

  detectUnusualActivity(userId, activity) {
    if (!userId || !activity) {
      return {
        suspicious: false,
        error: 'User ID and activity are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof userId !== 'string' || typeof activity !== 'string') {
      return {
        suspicious: false,
        error: 'User ID and activity must be strings',
        code: 'INVALID_PARAMETER_TYPE',
      };
    }

    // Detect unusual patterns
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Flag unusual times (e.g., 2 AM - 5 AM)
    const isUnusualTime = hour >= 2 && hour <= 5;

    // Flag weekend activity for certain operations
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isUnusualDay = isWeekend && activity.includes('admin');

    const suspicious = isUnusualTime || isUnusualDay;

    if (suspicious) {
      const reasons = [];
      if (isUnusualTime) reasons.push('unusual time');
      if (isUnusualDay) reasons.push('weekend admin activity');

      logger.warn(`Suspicious activity detected: Unusual pattern for ${userId} - ${activity} (${reasons.join(', ')})`);
      auditLogService.logSuspiciousActivity(
        userId,
        'unusual-activity',
        {
          activity,
          reasons,
          hour,
          dayOfWeek,
        },
        'medium'
      );
    }

    return {
      suspicious,
      userId,
      activity,
      reasons: suspicious ? (isUnusualTime ? ['unusual-time'] : []) : [],
      code: suspicious ? 'UNUSUAL_ACTIVITY_DETECTED' : 'NORMAL_ACTIVITY',
      timestamp: new Date().toISOString(),
    };
  }

  detectRoleEscalation(userId, oldRole, newRole) {
    if (!userId || !oldRole || !newRole) {
      return {
        suspicious: false,
        error: 'User ID, old role, and new role are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof userId !== 'string' || typeof oldRole !== 'string' || typeof newRole !== 'string') {
      return {
        suspicious: false,
        error: 'Parameters must be strings',
        code: 'INVALID_PARAMETER_TYPE',
      };
    }

    // Define role hierarchy
    const roleHierarchy = {
      'user': 1,
      'admin': 2,
      'super_admin': 3,
    };

    const oldLevel = roleHierarchy[oldRole] || 0;
    const newLevel = roleHierarchy[newRole] || 0;

    // Escalation is when new role is higher than old role
    const suspicious = newLevel > oldLevel;

    if (suspicious) {
      logger.warn(`Suspicious activity detected: Role escalation for ${userId} (${oldRole} -> ${newRole})`);
      auditLogService.logSuspiciousActivity(
        userId,
        'role-escalation',
        {
          oldRole,
          newRole,
          escalationLevel: newLevel - oldLevel,
        },
        'critical'
      );
    }

    return {
      suspicious,
      userId,
      oldRole,
      newRole,
      escalation: newLevel - oldLevel,
      code: suspicious ? 'PRIVILEGE_ESCALATION_DETECTED' : 'NORMAL_ROLE_CHANGE',
      timestamp: new Date().toISOString(),
    };
  }

  detectCrossUserAccess(userId, targetUserId) {
    if (!userId || !targetUserId) {
      return {
        suspicious: false,
        error: 'User ID and target user ID are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof userId !== 'string' || typeof targetUserId !== 'string') {
      return {
        suspicious: false,
        error: 'User IDs must be strings',
        code: 'INVALID_PARAMETER_TYPE',
      };
    }

    // Cross-user access is always suspicious
    const suspicious = userId !== targetUserId;

    if (suspicious) {
      logger.error(`Suspicious activity detected: Cross-user access attempt by ${userId} to ${targetUserId}`);
      auditLogService.logSuspiciousActivity(
        userId,
        'cross-user-access',
        {
          targetUserId,
          accessType: 'unauthorized',
        },
        'critical'
      );
    }

    return {
      suspicious,
      userId,
      targetUserId,
      code: suspicious ? 'CROSS_USER_ACCESS_DETECTED' : 'NORMAL_ACCESS',
      timestamp: new Date().toISOString(),
    };
  }

  detectAPIAbuse(userId, endpoint, requestCount, threshold = 100) {
    if (!userId || !endpoint || typeof requestCount !== 'number') {
      return {
        suspicious: false,
        error: 'User ID, endpoint, and request count are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof threshold !== 'number' || threshold < 1) {
      threshold = 100;
    }

    const suspicious = requestCount > threshold;

    if (suspicious) {
      logger.warn(`Suspicious activity detected: API abuse by ${userId} on ${endpoint} (${requestCount} requests)`);
      auditLogService.logSuspiciousActivity(
        userId,
        'api-abuse',
        {
          endpoint,
          requestCount,
          threshold,
          excessRequests: requestCount - threshold,
        },
        'high'
      );
    }

    return {
      suspicious,
      userId,
      endpoint,
      requestCount,
      threshold,
      code: suspicious ? 'API_ABUSE_DETECTED' : 'NORMAL_USAGE',
      timestamp: new Date().toISOString(),
    };
  }

  detectDataExfiltration(userId, dataSize, threshold = 1000000) {
    if (!userId || typeof dataSize !== 'number') {
      return {
        suspicious: false,
        error: 'User ID and data size are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof threshold !== 'number' || threshold < 1) {
      threshold = 1000000; // 1MB default
    }

    const suspicious = dataSize > threshold;

    if (suspicious) {
      const sizeMB = (dataSize / 1024 / 1024).toFixed(2);
      const thresholdMB = (threshold / 1024 / 1024).toFixed(2);
      logger.error(`Suspicious activity detected: Data exfiltration by ${userId} (${sizeMB}MB > ${thresholdMB}MB)`);
      auditLogService.logSuspiciousActivity(
        userId,
        'data-exfiltration',
        {
          dataSize,
          dataSizeMB: sizeMB,
          threshold,
          thresholdMB,
          excessSize: dataSize - threshold,
        },
        'critical'
      );
    }

    return {
      suspicious,
      userId,
      dataSize,
      dataSizeMB: (dataSize / 1024 / 1024).toFixed(2),
      threshold,
      code: suspicious ? 'DATA_EXFILTRATION_DETECTED' : 'NORMAL_TRANSFER',
      timestamp: new Date().toISOString(),
    };
  }

  logSuspiciousActivity(userId, activity, severity = 'medium', details = {}) {
    if (!userId || !activity) {
      logger.warn('Invalid suspicious activity log parameters');
      return null;
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      severity = 'medium';
    }

    const logEntry = {
      id: `suspicious-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      activity,
      severity,
      details,
      timestamp: new Date().toISOString(),
    };

    this.suspiciousActivityLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.suspiciousActivityLog.length > this.maxActivityLogs) {
      this.suspiciousActivityLog = this.suspiciousActivityLog.slice(-this.maxActivityLogs);
    }

    logger.warn(`Suspicious activity logged: ${userId} - ${activity} (severity: ${severity})`);
    return logEntry;
  }

  getSuspiciousActivityLog(filters = {}) {
    if (typeof filters !== 'object' || filters === null) {
      return {
        activities: this.suspiciousActivityLog.slice(),
        count: this.suspiciousActivityLog.length,
        filters: {},
        timestamp: new Date().toISOString(),
      };
    }

    let results = this.suspiciousActivityLog.slice();

    // Filter by userId
    if (filters.userId && typeof filters.userId === 'string') {
      results = results.filter(log => log.userId === filters.userId);
    }

    // Filter by severity
    if (filters.severity && typeof filters.severity === 'string') {
      results = results.filter(log => log.severity === filters.severity);
    }

    // Filter by activity
    if (filters.activity && typeof filters.activity === 'string') {
      results = results.filter(log => log.activity === filters.activity);
    }

    // Apply limit
    if (filters.limit && typeof filters.limit === 'number' && filters.limit > 0) {
      results = results.slice(-filters.limit);
    }

    return {
      activities: results,
      count: results.length,
      filters,
      timestamp: new Date().toISOString(),
    };
  }

  getServiceStatus() {
    return {
      initialized: this.initialized,
      trackedEmails: this.loginAttempts.size,
      trackedUsers: this.apiRequests.size,
      suspiciousActivityCount: this.suspiciousActivityLog.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const suspiciousActivityDetectionService = new SuspiciousActivityDetectionService();

export default suspiciousActivityDetectionService;
export { SuspiciousActivityDetectionService };