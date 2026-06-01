import 'dotenv/config';
import logger from '../../utils/logger.js';
import roleBasedAccessControlService from './RoleBasedAccessControlService.js';

class DashboardPermissionService {
  constructor() {
    this.dashboardConfigs = this.initializeDashboardConfigs();
    this.initialized = true;
    logger.info('Dashboard Permission Service initialized');
  }

  initializeDashboardConfigs() {
    return {
      SUPER_ADMIN: {
        type: 'admin',
        name: 'Admin Dashboard',
        description: 'Full administrative dashboard with all features',
        components: [
          'infrastructure-status',
          'ai-usage-analytics',
          'active-sessions',
          'error-monitoring',
          'user-management',
          'role-management',
          'system-health',
          'activity-logs',
          'metrics-snapshot',
          'metrics-trends',
          'user-analytics',
          'system-analytics',
          'subscription-analytics',
          'revenue-tracking',
        ],
        routes: [
          '/admin/infrastructure',
          '/admin/monitoring',
          '/admin/users',
          '/admin/roles',
          '/admin/analytics',
          '/admin/logs',
          '/admin/settings',
        ],
        features: [
          'admin-dashboard',
          'manage-users',
          'manage-roles',
          'view-analytics',
          'view-logs',
          'system-config',
        ],
      },
      USER: {
        type: 'user',
        name: 'User Dashboard',
        description: 'Standard user dashboard with limited features',
        components: [
          'workspace-overview',
          'my-systems',
          'my-automations',
          'my-blueprints',
          'usage-analytics',
          'subscription-status',
          'credit-balance',
          'resource-usage',
        ],
        routes: [
          '/user/isolation',
          '/user/subscription',
          '/ai/openrouter',
          '/ai/testing',
          '/ai/blueprint',
          '/ai/plan',
        ],
        features: [
          'user-dashboard',
          'ai-access',
          'manage-resources',
        ],
      },
    };
  }

  getUserDashboardType(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const userRole = roleBasedAccessControlService.getUserRole(userId).role;
    const dashboardConfig = this.dashboardConfigs[userRole];

    if (!dashboardConfig) {
      throw new Error(`No dashboard configuration found for role: ${userRole}`);
    }

    return {
      userId,
      role: userRole,
      dashboardType: dashboardConfig.type,
      name: dashboardConfig.name,
      description: dashboardConfig.description,
      timestamp: new Date().toISOString(),
    };
  }

  canAccessUserDashboard(userId) {
    if (!userId || typeof userId !== 'string') {
      return {
        allowed: false,
        error: 'User ID is required and must be a string',
        code: 'INVALID_USER_ID',
      };
    }

    const userRole = roleBasedAccessControlService.getUserRole(userId).role;
    const dashboardConfig = this.dashboardConfigs[userRole];

    if (!dashboardConfig) {
      return {
        allowed: false,
        error: `No dashboard configuration found for role: ${userRole}`,
        code: 'NO_DASHBOARD_CONFIG',
      };
    }

    if (dashboardConfig.type !== 'user') {
      return {
        allowed: false,
        error: 'User does not have access to user dashboard',
        code: 'DASHBOARD_ACCESS_DENIED',
      };
    }

    return {
      allowed: true,
      userId,
      role: userRole,
      dashboardType: dashboardConfig.type,
      code: 'DASHBOARD_ALLOWED',
    };
  }

  canAccessAdminDashboard(userId) {
    if (!userId || typeof userId !== 'string') {
      return {
        allowed: false,
        error: 'User ID is required and must be a string',
        code: 'INVALID_USER_ID',
      };
    }

    const isSuperAdmin = roleBasedAccessControlService.isSuperAdmin(userId);

    if (!isSuperAdmin) {
      logger.warn(`Admin dashboard access denied: ${userId}`);
      return {
        allowed: false,
        error: 'User does not have access to admin dashboard',
        code: 'ADMIN_ACCESS_DENIED',
      };
    }

    const dashboardConfig = this.dashboardConfigs.SUPER_ADMIN;

    return {
      allowed: true,
      userId,
      role: 'SUPER_ADMIN',
      dashboardType: dashboardConfig.type,
      code: 'ADMIN_DASHBOARD_ALLOWED',
    };
  }

  getVisibleComponents(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const userRole = roleBasedAccessControlService.getUserRole(userId).role;
    const dashboardConfig = this.dashboardConfigs[userRole];

    if (!dashboardConfig) {
      throw new Error(`No dashboard configuration found for role: ${userRole}`);
    }

    return {
      userId,
      role: userRole,
      components: dashboardConfig.components,
      componentCount: dashboardConfig.components.length,
      timestamp: new Date().toISOString(),
    };
  }

  getVisibleRoutes(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const userRole = roleBasedAccessControlService.getUserRole(userId).role;
    const dashboardConfig = this.dashboardConfigs[userRole];

    if (!dashboardConfig) {
      throw new Error(`No dashboard configuration found for role: ${userRole}`);
    }

    return {
      userId,
      role: userRole,
      routes: dashboardConfig.routes,
      routeCount: dashboardConfig.routes.length,
      timestamp: new Date().toISOString(),
    };
  }

  validateDashboardAccess(userId, dashboardType) {
    if (!userId || !dashboardType) {
      return {
        valid: false,
        error: 'User ID and dashboard type are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const userRole = roleBasedAccessControlService.getUserRole(userId).role;
    const dashboardConfig = this.dashboardConfigs[userRole];

    if (!dashboardConfig) {
      return {
        valid: false,
        error: `No dashboard configuration found for role: ${userRole}`,
        code: 'NO_DASHBOARD_CONFIG',
      };
    }

    if (dashboardConfig.type !== dashboardType) {
      logger.warn(`Dashboard access validation failed: ${userId} cannot access ${dashboardType} dashboard`);
      return {
        valid: false,
        error: `User does not have access to ${dashboardType} dashboard`,
        code: 'DASHBOARD_ACCESS_DENIED',
        userId,
        requestedDashboard: dashboardType,
        allowedDashboard: dashboardConfig.type,
      };
    }

    return {
      valid: true,
      message: 'User has access to dashboard',
      code: 'DASHBOARD_ACCESS_VALID',
      userId,
      role: userRole,
      dashboardType,
    };
  }

  getDashboardPermissions(role) {
    if (!role || typeof role !== 'string') {
      throw new Error('Role is required and must be a string');
    }

    const dashboardConfig = this.dashboardConfigs[role];

    if (!dashboardConfig) {
      throw new Error(`No dashboard configuration found for role: ${role}`);
    }

    return {
      role,
      dashboardType: dashboardConfig.type,
      name: dashboardConfig.name,
      description: dashboardConfig.description,
      components: dashboardConfig.components,
      routes: dashboardConfig.routes,
      features: dashboardConfig.features,
      permissions: {
        componentCount: dashboardConfig.components.length,
        routeCount: dashboardConfig.routes.length,
        featureCount: dashboardConfig.features.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  validateComponentAccess(userId, component) {
    if (!userId || !component) {
      return {
        allowed: false,
        error: 'User ID and component are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const userRole = roleBasedAccessControlService.getUserRole(userId).role;
    const dashboardConfig = this.dashboardConfigs[userRole];

    if (!dashboardConfig) {
      return {
        allowed: false,
        error: `No dashboard configuration found for role: ${userRole}`,
        code: 'NO_DASHBOARD_CONFIG',
      };
    }

    const allowed = dashboardConfig.components.includes(component);

    if (!allowed) {
      logger.warn(`Component access denied: ${userId} cannot access ${component}`);
    }

    return {
      allowed,
      userId,
      role: userRole,
      component,
      code: allowed ? 'COMPONENT_ALLOWED' : 'COMPONENT_DENIED',
    };
  }

  validateRouteAccess(userId, route) {
    if (!userId || !route) {
      return {
        allowed: false,
        error: 'User ID and route are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const userRole = roleBasedAccessControlService.getUserRole(userId).role;
    const dashboardConfig = this.dashboardConfigs[userRole];

    if (!dashboardConfig) {
      return {
        allowed: false,
        error: `No dashboard configuration found for role: ${userRole}`,
        code: 'NO_DASHBOARD_CONFIG',
      };
    }

    const allowed = dashboardConfig.routes.includes(route);

    if (!allowed) {
      logger.warn(`Route access denied: ${userId} cannot access ${route}`);
    }

    return {
      allowed,
      userId,
      role: userRole,
      route,
      code: allowed ? 'ROUTE_ALLOWED' : 'ROUTE_DENIED',
    };
  }
}

const dashboardPermissionService = new DashboardPermissionService();

export default dashboardPermissionService;
export { DashboardPermissionService };