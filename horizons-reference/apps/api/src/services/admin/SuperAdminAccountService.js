import 'dotenv/config';
import logger from '../../utils/logger.js';

class SuperAdminAccountService {
  constructor() {
    this.superAdminId = null;
    this.superAdminEmail = null;
    this.accessLog = new Map();
    this.maxAccessLogEntries = 1000;
    this.initialized = true;
    logger.info('Super Admin Account Service initialized');
  }

  createInitialSuperAdmin(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('Email and password must be strings');
    }

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if Super Admin already exists
    if (this.superAdminId) {
      logger.error('Super Admin account already exists. Cannot create another.');
      throw new Error('Super Admin account already exists');
    }

    // In a real implementation, this would create user in PocketBase
    // For now, simulate creation
    const superAdminId = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.superAdminId = superAdminId;
    this.superAdminEmail = email;

    logger.info(`Initial Super Admin account created: ${email}`);
    this.trackSuperAdminAccess('SUPER_ADMIN_CREATED', { email });

    return {
      success: true,
      userId: superAdminId,
      email,
      role: 'SUPER_ADMIN',
      timestamp: new Date().toISOString(),
    };
  }

  getSuperAdminAccount() {
    if (!this.superAdminId) {
      return null;
    }

    return {
      userId: this.superAdminId,
      email: this.superAdminEmail,
      role: 'SUPER_ADMIN',
      timestamp: new Date().toISOString(),
    };
  }

  validateSuperAdminExists() {
    const exists = this.superAdminId !== null && this.superAdminEmail !== null;

    if (!exists) {
      logger.warn('Super Admin account does not exist');
    }

    return exists;
  }

  isSuperAdminAccount(userId) {
    if (!userId || typeof userId !== 'string') {
      return false;
    }

    return userId === this.superAdminId;
  }

  getSuperAdminEmail() {
    if (!this.superAdminEmail) {
      throw new Error('Super Admin account not found');
    }

    return this.superAdminEmail;
  }

  updateSuperAdminPassword(oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
      throw new Error('Old password and new password are required');
    }

    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      throw new Error('Passwords must be strings');
    }

    if (!this.superAdminId) {
      throw new Error('Super Admin account not found');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // In a real implementation, this would:
    // 1. Fetch Super Admin from PocketBase
    // 2. Verify oldPassword matches stored password
    // 3. Update password in PocketBase
    // For now, simulate password update

    logger.info(`Super Admin password updated: ${this.superAdminEmail}`);
    this.trackSuperAdminAccess('PASSWORD_UPDATED', { email: this.superAdminEmail });

    return {
      success: true,
      message: 'Super Admin password updated successfully',
      email: this.superAdminEmail,
      timestamp: new Date().toISOString(),
    };
  }

  trackSuperAdminAccess(action, details = {}) {
    if (!action || typeof action !== 'string') {
      logger.warn('Invalid Super Admin access tracking parameters');
      return null;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    // Store in access log
    const logKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.accessLog.set(logKey, logEntry);

    // Keep only last 1000 entries
    if (this.accessLog.size > this.maxAccessLogEntries) {
      const firstKey = this.accessLog.keys().next().value;
      this.accessLog.delete(firstKey);
    }

    logger.info(`Super Admin access tracked: ${action}`);
    return logEntry;
  }

  getSuperAdminAccessLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    const logs = Array.from(this.accessLog.values());
    const recentLogs = logs.slice(-limit);

    return {
      logs: recentLogs,
      count: logs.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  preventSuperAdminDeletion(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required');
    }

    if (this.isSuperAdminAccount(userId)) {
      logger.error(`Super Admin deletion attempt: ${userId}`);
      this.trackSuperAdminAccess('DELETION_ATTEMPT_BLOCKED', { userId });
      throw new Error('Super Admin account cannot be deleted');
    }

    return {
      prevented: false,
      message: 'User is not Super Admin',
      code: 'NOT_SUPER_ADMIN',
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  preventSuperAdminRoleRemoval(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required');
    }

    if (this.isSuperAdminAccount(userId)) {
      logger.error(`Super Admin role removal attempt: ${userId}`);
      this.trackSuperAdminAccess('ROLE_REMOVAL_ATTEMPT_BLOCKED', { userId });
      throw new Error('Super Admin role cannot be removed');
    }

    return {
      prevented: false,
      message: 'User is not Super Admin',
      code: 'NOT_SUPER_ADMIN',
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  preventSuperAdminModification(userId, operation) {
    if (!userId || !operation) {
      throw new Error('User ID and operation are required');
    }

    if (this.isSuperAdminAccount(userId)) {
      logger.error(`Super Admin modification attempt: ${userId} - ${operation}`);
      this.trackSuperAdminAccess('MODIFICATION_ATTEMPT_BLOCKED', { userId, operation });
      throw new Error(`Super Admin account cannot be modified via ${operation} operation`);
    }

    return {
      prevented: false,
      message: 'User is not Super Admin',
      code: 'NOT_SUPER_ADMIN',
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getSuperAdminStatus() {
    return {
      exists: this.validateSuperAdminExists(),
      email: this.superAdminEmail,
      userId: this.superAdminId,
      accessLogSize: this.accessLog.size,
      timestamp: new Date().toISOString(),
    };
  }
}

const superAdminAccountService = new SuperAdminAccountService();

export default superAdminAccountService;
export { SuperAdminAccountService };