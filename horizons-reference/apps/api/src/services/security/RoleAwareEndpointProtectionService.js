import 'dotenv/config';
import logger from '../../utils/logger.js';

class RoleAwareEndpointProtectionService {
  constructor() {
    this.roleHierarchy = this.initializeRoleHierarchy();
    this.rolePermissions = this.initializeRolePermissions();
    this.accessLog = [];
    this.maxAccessLogEntries = 1000;
    this.initialized = true;
    logger.info('Role-Aware Endpoint Protection Service initialized');
  }

  initializeRoleHierarchy() {
    return {
      SUPER_ADMIN: {
        level: 100,
        name: 'Super Administrator',
        description: 'Full system access and control',
        inherits: ['USER'],
      },
      USER: {
        level: 1,
        name: 'User',
        description: 'Standard user access',
        inherits: [],
      },
    };
  }

  initializeRolePermissions() {
    return {
      SUPER_ADMIN: [
        'admin:read',
        'admin:write',
        'admin:delete',
        'admin:manage-users',
        'admin:manage-roles',
        'admin:view-analytics',
        'admin:view-logs',
        'admin:system-config',
        'user:read',
        'user:write',
        'user:delete',
        'user:access-dashboard',
        'user:access-ai',
        'user:manage-resources',
      ],
      USER: [
        'user:read',
        'user:write',
        'user:delete',
        'user:access-dashboard',
        'user:access-ai',
        'user:manage-resources',
      ],
    };
  }

  validateEndpointRole(userId, requiredRole) {
    if (!userId || !requiredRole) {
      throw new Error('User ID and required role are required');
    }

    if (typeof userId !== 'string' || typeof requiredRole !== 'string') {
      throw new Error('User ID and required role must be strings');
    }

    const validRoles = Object.keys(this.roleHierarchy);
    if (!validRoles.includes(requiredRole)) {
      throw new Error(`Invalid required role: ${requiredRole}`);
    }

    // In real implementation, fetch user role from database
    // For now, simulate role check
    const userRole = this.getUserRole(userId);

    if (!this.hasRole(userRole, requiredRole)) {
      logger.error(`Endpoint role validation failed: ${userId} requires ${requiredRole} but has ${userRole}`);
      this.logUnauthorizedRoleAccess(userId, requiredRole, userRole);
      throw new Error(`User does not have required role: ${requiredRole}`);
    }

    logger.debug(`Endpoint role validated: ${userId} has ${requiredRole}`);
    return {
      valid: true,
      userId,
      requiredRole,
      userRole,
      timestamp: new Date().toISOString(),
    };
  }

  validateSuperAdminRole(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const userRole = this.getUserRole(userId);

    if (userRole !== 'SUPER_ADMIN') {
      logger.error(`Super Admin validation failed: ${userId} is not SUPER_ADMIN (has ${userRole})`);
      this.logUnauthorizedRoleAccess(userId, 'SUPER_ADMIN', userRole);
      throw new Error('User is not a Super Admin');
    }

    logger.debug(`Super Admin role validated: ${userId}`);
    return {
      valid: true,
      userId,
      role: 'SUPER_ADMIN',
      timestamp: new Date().toISOString(),
    };
  }

  validateUserRole(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const userRole = this.getUserRole(userId);

    if (userRole !== 'USER') {
      logger.error(`User role validation failed: ${userId} is not USER (has ${userRole})`);
      this.logUnauthorizedRoleAccess(userId, 'USER', userRole);
      throw new Error('User does not have USER role');
    }

    logger.debug(`User role validated: ${userId}`);
    return {
      valid: true,
      userId,
      role: 'USER',
      timestamp: new Date().toISOString(),
    };
  }

  validateRoleHierarchy(userRole, requiredRole) {
    if (!userRole || !requiredRole) {
      throw new Error('User role and required role are required');
    }

    if (typeof userRole !== 'string' || typeof requiredRole !== 'string') {
      throw new Error('Roles must be strings');
    }

    const validRoles = Object.keys(this.roleHierarchy);
    if (!validRoles.includes(userRole) || !validRoles.includes(requiredRole)) {
      throw new Error('Invalid role in hierarchy validation');
    }

    const userHierarchy = this.roleHierarchy[userRole];
    const requiredHierarchy = this.roleHierarchy[requiredRole];

    // User role must be >= required role in hierarchy
    if (userHierarchy.level < requiredHierarchy.level) {
      logger.warn(`Role hierarchy validation failed: ${userRole} (level ${userHierarchy.level}) < ${requiredRole} (level ${requiredHierarchy.level})`);
      return {
        valid: false,
        error: `User role ${userRole} does not meet required role ${requiredRole}`,
        code: 'INSUFFICIENT_ROLE_LEVEL',
        userRole,
        userLevel: userHierarchy.level,
        requiredRole,
        requiredLevel: requiredHierarchy.level,
      };
    }

    logger.debug(`Role hierarchy validated: ${userRole} >= ${requiredRole}`);
    return {
      valid: true,
      userRole,
      userLevel: userHierarchy.level,
      requiredRole,
      requiredLevel: requiredHierarchy.level,
      timestamp: new Date().toISOString(),
    };
  }

  checkRolePermission(userId, permission) {
    if (!userId || !permission) {
      return false;
    }

    if (typeof userId !== 'string' || typeof permission !== 'string') {
      return false;
    }

    const userRole = this.getUserRole(userId);
    const permissions = this.rolePermissions[userRole] || [];

    return permissions.includes(permission);
  }

  validateRoleIntegrity(sessionRole, userRole) {
    if (!sessionRole || !userRole) {
      throw new Error('Session role and user role are required');
    }

    if (typeof sessionRole !== 'string' || typeof userRole !== 'string') {
      throw new Error('Roles must be strings');
    }

    if (sessionRole !== userRole) {
      logger.error(`Role integrity validation failed: session role ${sessionRole} != user role ${userRole}`);
      throw new Error('Role integrity violation: Session role does not match user role');
    }

    logger.debug(`Role integrity validated: ${sessionRole}`);
    return {
      valid: true,
      role: sessionRole,
      timestamp: new Date().toISOString(),
    };
  }

  preventRoleSpoofing(userId, claimedRole) {
    if (!userId || !claimedRole) {
      throw new Error('User ID and claimed role are required');
    }

    if (typeof userId !== 'string' || typeof claimedRole !== 'string') {
      throw new Error('User ID and claimed role must be strings');
    }

    const actualRole = this.getUserRole(userId);

    if (claimedRole !== actualRole) {
      logger.error(`Role spoofing attempt detected: ${userId} claimed ${claimedRole} but has ${actualRole}`);
      this.logUnauthorizedRoleAccess(userId, claimedRole, actualRole);
      throw new Error('Role spoofing detected: Claimed role does not match actual role');
    }

    logger.debug(`Role spoofing prevention passed: ${userId}`);
    return {
      valid: true,
      userId,
      role: actualRole,
      timestamp: new Date().toISOString(),
    };
  }

  logUnauthorizedRoleAccess(userId, requiredRole, attemptedRole) {
    if (!userId || !requiredRole || !attemptedRole) {
      logger.warn('Invalid unauthorized role access log parameters');
      return null;
    }

    const logEntry = {
      id: `role-violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      requiredRole,
      attemptedRole,
      timestamp: new Date().toISOString(),
    };

    this.accessLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.accessLog.length > this.maxAccessLogEntries) {
      this.accessLog = this.accessLog.slice(-this.maxAccessLogEntries);
    }

    logger.error(`Unauthorized role access: ${userId} attempted ${attemptedRole} but required ${requiredRole}`);
    return logEntry;
  }

  hasRole(userRole, requiredRole) {
    if (!userRole || !requiredRole) {
      return false;
    }

    if (userRole === requiredRole) {
      return true;
    }

    // Check inherited roles
    const hierarchy = this.roleHierarchy[userRole];
    if (hierarchy && hierarchy.inherits && hierarchy.inherits.includes(requiredRole)) {
      return true;
    }

    return false;
  }

  getUserRole(userId) {
    // In real implementation, fetch from database
    // For now, return default USER role
    if (!userId) {
      return null;
    }

    // Simulate: return USER role by default
    return 'USER';
  }

  getAccessLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    return {
      log: this.accessLog.slice(-limit),
      count: this.accessLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  clearAccessLog() {
    const clearedCount = this.accessLog.length;
    this.accessLog = [];
    logger.info(`Role access log cleared: ${clearedCount} entries`);
    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }
}

const roleAwareEndpointProtectionService = new RoleAwareEndpointProtectionService();

export default roleAwareEndpointProtectionService;
export { RoleAwareEndpointProtectionService };