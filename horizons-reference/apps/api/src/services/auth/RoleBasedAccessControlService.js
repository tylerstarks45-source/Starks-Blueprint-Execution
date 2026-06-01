import 'dotenv/config';
import logger from '../../utils/logger.js';

class RoleBasedAccessControlService {
  constructor() {
    this.userRoles = new Map();
    this.roleHierarchy = this.initializeRoleHierarchy();
    this.rolePermissions = this.initializeRolePermissions();
    this.initialized = true;
    logger.info('Role-Based Access Control Service initialized');
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

  getUserRole(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    let role = this.userRoles.get(userId);
    if (!role) {
      // Default to USER role
      role = 'USER';
      this.userRoles.set(userId, role);
    }

    return {
      userId,
      role,
      hierarchy: this.roleHierarchy[role],
      permissions: this.rolePermissions[role] || [],
      timestamp: new Date().toISOString(),
    };
  }

  hasRole(userId, role) {
    if (!userId || !role) {
      return false;
    }

    const userRole = this.getUserRole(userId).role;
    if (userRole === role) {
      return true;
    }

    // Check inherited roles
    const hierarchy = this.roleHierarchy[userRole];
    if (hierarchy && hierarchy.inherits && hierarchy.inherits.includes(role)) {
      return true;
    }

    return false;
  }

  hasAnyRole(userId, roles) {
    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      return false;
    }

    return roles.some(role => this.hasRole(userId, role));
  }

  hasAllRoles(userId, roles) {
    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      return false;
    }

    return roles.every(role => this.hasRole(userId, role));
  }

  isSuperAdmin(userId) {
    return this.hasRole(userId, 'SUPER_ADMIN');
  }

  isNormalUser(userId) {
    return this.hasRole(userId, 'USER');
  }

  canAccessFeature(userId, feature) {
    if (!userId || !feature) {
      return {
        allowed: false,
        error: 'User ID and feature are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const userRole = this.getUserRole(userId).role;
    const permissions = this.rolePermissions[userRole] || [];

    // Map features to permissions
    const featurePermissionMap = {
      'admin-dashboard': 'admin:read',
      'user-dashboard': 'user:access-dashboard',
      'ai-access': 'user:access-ai',
      'manage-users': 'admin:manage-users',
      'manage-roles': 'admin:manage-roles',
      'view-analytics': 'admin:view-analytics',
      'view-logs': 'admin:view-logs',
      'system-config': 'admin:system-config',
      'manage-resources': 'user:manage-resources',
    };

    const requiredPermission = featurePermissionMap[feature];
    if (!requiredPermission) {
      return {
        allowed: false,
        error: `Unknown feature: ${feature}`,
        code: 'UNKNOWN_FEATURE',
      };
    }

    const allowed = permissions.includes(requiredPermission);

    return {
      allowed,
      userId,
      feature,
      role: userRole,
      requiredPermission,
      code: allowed ? 'FEATURE_ALLOWED' : 'FEATURE_DENIED',
    };
  }

  canAccessRoute(userId, route) {
    if (!userId || !route) {
      return {
        allowed: false,
        error: 'User ID and route are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const userRole = this.getUserRole(userId).role;
    const permissions = this.rolePermissions[userRole] || [];

    // Map routes to required permissions
    const routePermissionMap = {
      '/admin/infrastructure': 'admin:read',
      '/admin/monitoring': 'admin:read',
      '/admin/users': 'admin:manage-users',
      '/user/isolation': 'user:access-dashboard',
      '/user/subscription': 'user:access-dashboard',
      '/ai/openrouter': 'user:access-ai',
      '/ai/testing': 'user:access-ai',
      '/ai/blueprint': 'user:access-ai',
      '/ai/plan': 'user:access-ai',
    };

    const requiredPermission = routePermissionMap[route];
    if (!requiredPermission) {
      // Unknown routes are accessible to all authenticated users
      return {
        allowed: true,
        userId,
        route,
        role: userRole,
        code: 'ROUTE_ALLOWED',
      };
    }

    const allowed = permissions.includes(requiredPermission);

    return {
      allowed,
      userId,
      route,
      role: userRole,
      requiredPermission,
      code: allowed ? 'ROUTE_ALLOWED' : 'ROUTE_DENIED',
    };
  }

  getPermissions(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const userRole = this.getUserRole(userId).role;
    const permissions = this.rolePermissions[userRole] || [];

    return {
      userId,
      role: userRole,
      permissions,
      permissionCount: permissions.length,
      timestamp: new Date().toISOString(),
    };
  }

  validateRoleAccess(userId, requiredRole) {
    if (!userId || !requiredRole) {
      return {
        valid: false,
        error: 'User ID and required role are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const hasRequiredRole = this.hasRole(userId, requiredRole);

    if (!hasRequiredRole) {
      logger.warn(`Role access validation failed: ${userId} requires ${requiredRole}`);
      return {
        valid: false,
        error: `User does not have required role: ${requiredRole}`,
        code: 'INSUFFICIENT_ROLE',
        userId,
        requiredRole,
      };
    }

    return {
      valid: true,
      message: 'User has required role',
      code: 'ROLE_VALID',
      userId,
      requiredRole,
    };
  }

  assignRole(userId, role, adminId) {
    if (!userId || !role || !adminId) {
      throw new Error('User ID, role, and admin ID are required');
    }

    // Verify admin is SUPER_ADMIN
    if (!this.isSuperAdmin(adminId)) {
      logger.warn(`Unauthorized role assignment attempt: ${adminId} tried to assign role to ${userId}`);
      throw new Error('Only SUPER_ADMIN can assign roles');
    }

    // Verify role exists
    if (!this.roleHierarchy[role]) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Prevent self-assignment
    if (userId === adminId && role !== 'USER') {
      logger.warn(`Self-role assignment attempt: ${adminId} tried to assign ${role} to self`);
      throw new Error('Cannot assign roles to yourself');
    }

    const previousRole = this.userRoles.get(userId) || 'USER';
    this.userRoles.set(userId, role);

    logger.info(`Role assigned: ${userId} -> ${role} (by ${adminId})`);

    return {
      success: true,
      userId,
      previousRole,
      newRole: role,
      assignedBy: adminId,
      timestamp: new Date().toISOString(),
    };
  }

  removeRole(userId, role, adminId) {
    if (!userId || !role || !adminId) {
      throw new Error('User ID, role, and admin ID are required');
    }

    // Verify admin is SUPER_ADMIN
    if (!this.isSuperAdmin(adminId)) {
      logger.warn(`Unauthorized role removal attempt: ${adminId} tried to remove role from ${userId}`);
      throw new Error('Only SUPER_ADMIN can remove roles');
    }

    const currentRole = this.userRoles.get(userId) || 'USER';

    if (currentRole !== role) {
      return {
        success: false,
        error: `User does not have role: ${role}`,
        code: 'ROLE_NOT_FOUND',
        userId,
        currentRole,
      };
    }

    // Reset to USER role
    this.userRoles.set(userId, 'USER');

    logger.info(`Role removed: ${userId} (${role} -> USER) (by ${adminId})`);

    return {
      success: true,
      userId,
      removedRole: role,
      newRole: 'USER',
      removedBy: adminId,
      timestamp: new Date().toISOString(),
    };
  }

  getRolePermissions(role) {
    if (!role || typeof role !== 'string') {
      throw new Error('Role is required and must be a string');
    }

    const permissions = this.rolePermissions[role];
    if (!permissions) {
      throw new Error(`Unknown role: ${role}`);
    }

    const hierarchy = this.roleHierarchy[role];

    return {
      role,
      name: hierarchy.name,
      description: hierarchy.description,
      level: hierarchy.level,
      permissions,
      permissionCount: permissions.length,
      inherits: hierarchy.inherits,
      timestamp: new Date().toISOString(),
    };
  }

  getAllRoles() {
    return {
      roles: Object.keys(this.roleHierarchy),
      roleCount: Object.keys(this.roleHierarchy).length,
      hierarchy: this.roleHierarchy,
      timestamp: new Date().toISOString(),
    };
  }

  getUsersByRole(role) {
    if (!role || typeof role !== 'string') {
      throw new Error('Role is required and must be a string');
    }

    const users = Array.from(this.userRoles.entries())
      .filter(([, userRole]) => userRole === role)
      .map(([userId]) => userId);

    return {
      role,
      users,
      count: users.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const roleBasedAccessControlService = new RoleBasedAccessControlService();

export default roleBasedAccessControlService;
export { RoleBasedAccessControlService };