import 'dotenv/config';
import logger from '../../utils/logger.js';

class RoleBasedEndpointRegistry {
  constructor() {
    this.endpointRoles = this.initializeEndpointRoles();
    this.initialized = true;
    logger.info('Role-Based Endpoint Registry initialized');
  }

  initializeEndpointRoles() {
    return {
      // Admin endpoints
      '/admin/users': 'SUPER_ADMIN',
      '/admin/users/:userId': 'SUPER_ADMIN',
      '/admin/users/:userId/assign-role': 'SUPER_ADMIN',
      '/admin/platform-metrics': 'SUPER_ADMIN',
      '/admin/ai-usage': 'SUPER_ADMIN',
      '/admin/subscriptions': 'SUPER_ADMIN',
      '/admin/error-logs': 'SUPER_ADMIN',
      '/admin/system-health': 'SUPER_ADMIN',
      '/admin/test-ai-connection': 'SUPER_ADMIN',
      '/admin/activity-logs': 'SUPER_ADMIN',

      // User endpoints
      '/user/my-profile': 'USER',
      '/user/my-subscription': 'USER',
      '/user/my-credits': 'USER',
      '/user/my-systems': 'USER',
      '/user/my-automations': 'USER',
      '/user/my-blueprints': 'USER',
      '/user/my-analytics': 'USER',
      '/user/create-system': 'USER',
      '/user/create-automation': 'USER',

      // Public endpoints
      '/health': 'PUBLIC',
      '/setup/initialization-status': 'PUBLIC',
    };
  }

  getEndpointRoleRequirement(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint is required and must be a string');
    }

    // Check exact match first
    if (endpoint in this.endpointRoles) {
      return this.endpointRoles[endpoint];
    }

    // Check pattern match (e.g., /admin/users/:userId)
    for (const [registeredEndpoint, role] of Object.entries(this.endpointRoles)) {
      if (this.matchesPattern(endpoint, registeredEndpoint)) {
        return role;
      }
    }

    // Default to requiring authentication
    return 'AUTHENTICATED';
  }

  validateEndpointAccess(userId, endpoint) {
    if (!userId || !endpoint) {
      throw new Error('User ID and endpoint are required');
    }

    if (typeof userId !== 'string' || typeof endpoint !== 'string') {
      throw new Error('User ID and endpoint must be strings');
    }

    const requiredRole = this.getEndpointRoleRequirement(endpoint);

    // Public endpoints don't require role
    if (requiredRole === 'PUBLIC') {
      return {
        allowed: true,
        userId,
        endpoint,
        requiredRole,
        code: 'PUBLIC_ENDPOINT',
      };
    }

    // In real implementation, fetch user role from database
    // For now, simulate role check
    const userRole = this.getUserRole(userId);

    if (!userRole) {
      logger.warn(`Endpoint access validation failed: ${userId} has no role`);
      throw new Error('User has no role assigned');
    }

    if (userRole !== requiredRole && requiredRole !== 'AUTHENTICATED') {
      logger.warn(`Endpoint access validation failed: ${userId} (${userRole}) cannot access ${endpoint} (requires ${requiredRole})`);
      throw new Error(`User does not have required role: ${requiredRole}`);
    }

    logger.debug(`Endpoint access validated: ${userId} can access ${endpoint}`);
    return {
      allowed: true,
      userId,
      endpoint,
      userRole,
      requiredRole,
      code: 'ACCESS_ALLOWED',
    };
  }

  isAdminEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
      return false;
    }

    const requiredRole = this.getEndpointRoleRequirement(endpoint);
    return requiredRole === 'SUPER_ADMIN';
  }

  isUserEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
      return false;
    }

    const requiredRole = this.getEndpointRoleRequirement(endpoint);
    return requiredRole === 'USER';
  }

  isPublicEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
      return false;
    }

    const requiredRole = this.getEndpointRoleRequirement(endpoint);
    return requiredRole === 'PUBLIC';
  }

  getAdminEndpoints() {
    return Object.entries(this.endpointRoles)
      .filter(([, role]) => role === 'SUPER_ADMIN')
      .map(([endpoint]) => endpoint);
  }

  getUserEndpoints() {
    return Object.entries(this.endpointRoles)
      .filter(([, role]) => role === 'USER')
      .map(([endpoint]) => endpoint);
  }

  getPublicEndpoints() {
    return Object.entries(this.endpointRoles)
      .filter(([, role]) => role === 'PUBLIC')
      .map(([endpoint]) => endpoint);
  }

  registerEndpointRole(endpoint, role) {
    if (!endpoint || !role) {
      throw new Error('Endpoint and role are required');
    }

    if (typeof endpoint !== 'string' || typeof role !== 'string') {
      throw new Error('Endpoint and role must be strings');
    }

    const validRoles = ['SUPER_ADMIN', 'USER', 'PUBLIC', 'AUTHENTICATED'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    this.endpointRoles[endpoint] = role;
    logger.info(`Endpoint role registered: ${endpoint} -> ${role}`);

    return {
      endpoint,
      role,
      timestamp: new Date().toISOString(),
    };
  }

  validateEndpointRoleMapping(endpoint, role) {
    if (!endpoint || !role) {
      return {
        valid: false,
        error: 'Endpoint and role are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    if (typeof endpoint !== 'string' || typeof role !== 'string') {
      return {
        valid: false,
        error: 'Endpoint and role must be strings',
        code: 'INVALID_PARAMETER_TYPE',
      };
    }

    const validRoles = ['SUPER_ADMIN', 'USER', 'PUBLIC', 'AUTHENTICATED'];
    if (!validRoles.includes(role)) {
      return {
        valid: false,
        error: `Invalid role: ${role}`,
        code: 'INVALID_ROLE',
      };
    }

    const registeredRole = this.endpointRoles[endpoint];
    if (!registeredRole) {
      return {
        valid: false,
        error: `Endpoint not registered: ${endpoint}`,
        code: 'ENDPOINT_NOT_REGISTERED',
      };
    }

    if (registeredRole !== role) {
      return {
        valid: false,
        error: `Endpoint role mismatch: ${endpoint} has ${registeredRole} but expected ${role}`,
        code: 'ROLE_MISMATCH',
        endpoint,
        registeredRole,
        expectedRole: role,
      };
    }

    logger.debug(`Endpoint role mapping validated: ${endpoint} -> ${role}`);
    return {
      valid: true,
      endpoint,
      role,
      code: 'MAPPING_VALID',
      timestamp: new Date().toISOString(),
    };
  }

  matchesPattern(endpoint, pattern) {
    // Convert pattern like /admin/users/:userId to regex
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(endpoint);
  }

  getUserRole(userId) {
    // In real implementation, fetch from database
    // For now, return default USER role
    if (!userId) {
      return null;
    }

    return 'USER';
  }

  getEndpointRegistry() {
    return {
      endpoints: this.endpointRoles,
      count: Object.keys(this.endpointRoles).length,
      adminEndpoints: this.getAdminEndpoints().length,
      userEndpoints: this.getUserEndpoints().length,
      publicEndpoints: this.getPublicEndpoints().length,
      timestamp: new Date().toISOString(),
    };
  }
}

const roleBasedEndpointRegistry = new RoleBasedEndpointRegistry();

export default roleBasedEndpointRegistry;
export { RoleBasedEndpointRegistry };