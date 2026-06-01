import express from 'express';
import { requireAuth, requireSuperAdmin } from '../../middleware/roleBasedAuth.js';
import roleBasedAccessControlService from '../../services/auth/RoleBasedAccessControlService.js';
import dashboardPermissionService from '../../services/auth/DashboardPermissionService.js';
import enhancedAuthService from '../../services/auth/EnhancedAuthService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Helper function to extract token from Authorization header
function extractTokenFromHeader(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// Helper function to verify token is valid
function isValidToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Token should be non-empty string
  return token.trim().length > 0;
}

// GET /my-role - Returns user's role and permissions
router.get('/my-role', requireAuth(), async (req, res) => {
  logger.info('GET /my-role endpoint called');
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  logger.debug('Request query:', JSON.stringify(req.query, null, 2));
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));

  const userId = req.userId;
  logger.info(`Authenticated user ID: ${userId}`);

  const roleData = roleBasedAccessControlService.getUserRole(userId);
  const permissions = roleBasedAccessControlService.getPermissions(userId);

  logger.info(`User role retrieved: ${roleData.role}`);
  logger.debug(`Permissions count: ${permissions.permissions.length}`);

  const response = {
    status: 'success',
    data: {
      userId,
      role: roleData.role,
      permissions: permissions.permissions,
      hierarchy: roleData.hierarchy,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(`GET /my-role response sent for user: ${userId}`);
  res.json(response);
});

// GET /dashboard-type - Returns user's dashboard type and permissions
router.get('/dashboard-type', requireAuth(), async (req, res) => {
  logger.info('GET /dashboard-type endpoint called');
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  logger.debug('Request query:', JSON.stringify(req.query, null, 2));
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));

  const userId = req.userId;
  logger.info(`Authenticated user ID: ${userId}`);

  const dashboardType = dashboardPermissionService.getUserDashboardType(userId);
  const permissions = dashboardPermissionService.getDashboardPermissions(dashboardType.role);

  logger.info(`Dashboard type retrieved: ${dashboardType.dashboardType}`);
  logger.debug(`Dashboard components count: ${permissions.components.length}`);

  const response = {
    status: 'success',
    data: {
      userId,
      dashboardType: dashboardType.dashboardType,
      name: dashboardType.name,
      description: dashboardType.description,
      permissions: permissions.permissions,
      components: permissions.components,
      routes: permissions.routes,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(`GET /dashboard-type response sent for user: ${userId}`);
  res.json(response);
});

// POST /permissions - Get permissions for a specific role
router.post('/permissions', async (req, res, next) => {
  logger.info('========== RBAC ENDPOINT CALLED ==========');
  logger.info('POST /permissions endpoint called');
  logger.info('RBAC Request Body:', JSON.stringify(req.body, null, 2));
  logger.info('RBAC Request Headers:', JSON.stringify(req.headers, null, 2));
  logger.info('RBAC Request Query:', JSON.stringify(req.query, null, 2));

  // Step 1: Extract and validate Authorization header
  logger.info('Step 1: Validating Authorization header');
  const authHeader = req.headers.authorization;
  logger.info(`Authorization header present: ${!!authHeader}`);
  logger.debug(`Authorization header value: ${authHeader}`);

  if (!authHeader) {
    logger.warn('Authorization header missing in POST /permissions request');
    return res.status(401).json({
      error: 'Authorization header is required',
      code: 'MISSING_AUTHORIZATION_HEADER',
    });
  }

  const token = extractTokenFromHeader(authHeader);
  logger.debug(`Token extracted from header: ${!!token}`);
  logger.debug(`Token value: ${token}`);

  if (!token || !isValidToken(token)) {
    logger.warn('Invalid or missing Bearer token in POST /permissions request');
    return res.status(401).json({
      error: 'Invalid or missing Bearer token',
      code: 'INVALID_TOKEN',
    });
  }

  logger.info('Authorization header validated successfully');

  // Step 2: Extract and validate role from request body
  logger.info('Step 2: Validating role parameter');
  const role = req.body?.role;
  logger.info(`Role from req.body.role: ${role}`);
  logger.info(`Role type: ${typeof role}`);
  logger.info(`Role is undefined: ${role === undefined}`);
  logger.info(`Role is null: ${role === null}`);
  logger.info(`Role is empty string: ${role === ''}`);
  logger.info(`Full request body: ${JSON.stringify(req.body)}`);

  if (!role) {
    logger.warn('========== MISSING_ROLE in request body ==========');
    logger.warn(`Role parameter missing in POST /permissions request body`);
    logger.warn(`Request body contents: ${JSON.stringify(req.body)}`);
    logger.warn(`Role value received: ${role}`);
    logger.warn(`Role type: ${typeof role}`);
    
    const error = new Error('Role parameter is required in request body');
    error.code = 'MISSING_ROLE';
    error.statusCode = 400;
    return next(error);
  }

  if (typeof role !== 'string') {
    logger.warn(`Role parameter is not a string in POST /permissions request: ${typeof role}`);
    const error = new Error(`Role must be a string, received ${typeof role}`);
    error.code = 'INVALID_ROLE_TYPE';
    error.statusCode = 400;
    return next(error);
  }

  logger.info(`========== Role parameter validated: ${role} ==========`);

  // Step 3: Fetch permissions for the role
  logger.info(`Step 3: Fetching permissions for role: ${role}`);

  let permissions;
  try {
    logger.info(`Calling roleBasedAccessControlService.getPermissions('${role}')`);
    permissions = roleBasedAccessControlService.getPermissions(role);
    logger.info(`Permissions fetched successfully for role: ${role}`);
    logger.info(`Permissions count: ${permissions.permissions.length}`);
    logger.debug(`Permissions array: ${JSON.stringify(permissions.permissions)}`);
  } catch (error) {
    logger.error(`Failed to fetch permissions for role ${role}: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    const err = new Error(`Failed to fetch permissions: ${error.message}`);
    err.code = 'PERMISSION_FETCH_ERROR';
    err.statusCode = 500;
    return next(err);
  }

  // Step 4: Return permissions
  logger.info(`Step 4: Returning permissions for role: ${role}`);
  const response = {
    status: 'success',
    role,
    permissions: permissions.permissions,
    permissionCount: permissions.permissions.length,
    message: 'Permissions retrieved successfully',
    timestamp: new Date().toISOString(),
  };

  logger.info(`========== RBAC Success ==========`);
  logger.info(`Role: ${role}`);
  logger.info(`Permissions count: ${permissions.permissions.length}`);
  logger.info(`Response: ${JSON.stringify(response)}`);
  logger.info(`POST /permissions completed successfully for role: ${role}`);
  
  res.json(response);
});

// GET /permissions - Get permissions for a specific role from query parameter
router.get('/permissions', async (req, res, next) => {
  logger.info('GET /permissions endpoint called');
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  logger.debug('Request query:', JSON.stringify(req.query, null, 2));
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));

  // Step 1: Extract and validate Authorization header
  logger.info('Step 1: Validating Authorization header');
  const authHeader = req.headers.authorization;
  logger.debug(`Authorization header present: ${!!authHeader}`);

  if (!authHeader) {
    logger.warn('Authorization header missing in GET /permissions request');
    const error = new Error('Authorization token is required');
    error.code = 'MISSING_AUTHORIZATION';
    error.statusCode = 401;
    return next(error);
  }

  const token = extractTokenFromHeader(authHeader);
  logger.debug(`Token extracted from header: ${!!token}`);

  if (!token || !isValidToken(token)) {
    logger.warn('Invalid or missing Bearer token in GET /permissions request');
    const error = new Error('Authorization token is required');
    error.code = 'INVALID_TOKEN';
    error.statusCode = 401;
    return next(error);
  }

  logger.info('Authorization header validated successfully');

  // Step 2: Extract and validate role from query parameter
  logger.info('Step 2: Validating role parameter');
  const { role } = req.query;
  logger.debug(`Role received from query parameter: ${role}`);
  logger.debug(`Role type: ${typeof role}`);
  logger.debug(`Role is undefined: ${role === undefined}`);
  logger.debug(`Role is null: ${role === null}`);

  if (!role) {
    logger.warn('Role parameter missing in GET /permissions request query');
    logger.warn(`Request query contents: ${JSON.stringify(req.query)}`);
    const error = new Error('Role parameter is required');
    error.code = 'MISSING_ROLE';
    error.statusCode = 400;
    return next(error);
  }

  if (typeof role !== 'string') {
    logger.warn(`Role parameter is not a string in GET /permissions request: ${typeof role}`);
    const error = new Error('Role must be a string');
    error.code = 'INVALID_ROLE_TYPE';
    error.statusCode = 400;
    return next(error);
  }

  logger.info(`Role parameter validated: ${role}`);

  // Step 3: Define role-to-permissions mapping
  logger.info(`Step 3: Fetching permissions for role: ${role}`);
  const rolePermissions = {
    SUPER_ADMIN: [
      'read',
      'write',
      'delete',
      'admin',
      'manage-users',
      'manage-roles',
      'view-analytics',
      'view-logs',
      'system-config',
    ],
    USER: [
      'read',
      'write',
      'delete',
      'access-dashboard',
      'access-ai',
      'manage-resources',
    ],
    ADMIN: [
      'read',
      'write',
      'delete',
      'admin',
      'manage-users',
      'view-analytics',
      'view-logs',
    ],
  };

  // Step 4: Get permissions for the role
  logger.info(`Step 4: Looking up permissions for role: ${role}`);
  const permissions = rolePermissions[role];

  if (!permissions) {
    logger.warn(`Invalid role requested: ${role}`);
    const error = new Error(`Invalid role: ${role}`);
    error.code = 'INVALID_ROLE';
    error.statusCode = 400;
    return next(error);
  }

  logger.info(`Permissions found for role: ${role}`);
  logger.debug(`Permissions count: ${permissions.length}`);

  // Step 5: Log the request
  logger.info('RBAC permissions requested', { role, tokenPresent: !!token });

  // Step 6: Return response
  const response = {
    role,
    permissions,
    permissionCount: permissions.length,
    message: 'Permissions retrieved successfully',
    timestamp: new Date().toISOString(),
  };

  logger.info(`GET /permissions completed successfully for role: ${role}`);
  res.json(response);
});

// GET /accessible-routes - Returns user's accessible routes
router.get('/accessible-routes', requireAuth(), async (req, res) => {
  logger.info('GET /accessible-routes endpoint called');
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  logger.debug('Request query:', JSON.stringify(req.query, null, 2));
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));

  const userId = req.userId;
  logger.info(`Authenticated user ID: ${userId}`);

  const visibleRoutes = dashboardPermissionService.getVisibleRoutes(userId);

  logger.info(`Accessible routes retrieved for user: ${userId}`);
  logger.debug(`Routes count: ${visibleRoutes.routeCount}`);

  const response = {
    status: 'success',
    data: {
      userId,
      routes: visibleRoutes.routes,
      routeCount: visibleRoutes.routeCount,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(`GET /accessible-routes response sent for user: ${userId}`);
  res.json(response);
});

// POST /assign-role - Assign role to user (SUPER_ADMIN only)
router.post('/assign-role', requireSuperAdmin(), async (req, res) => {
  logger.info('POST /assign-role endpoint called');
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  logger.debug('Request query:', JSON.stringify(req.query, null, 2));
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));

  const { userId, role } = req.body;
  const adminId = req.userId;

  logger.info(`Admin ${adminId} attempting to assign role to user ${userId}`);
  logger.debug(`Role to assign: ${role}`);

  if (!userId || !role) {
    logger.warn('Missing userId or role in POST /assign-role request');
    return res.status(400).json({
      error: 'User ID and role are required',
      code: 'MISSING_PARAMETERS',
    });
  }

  const result = roleBasedAccessControlService.assignRole(userId, role, adminId);

  logger.info(`Role assigned successfully: ${userId} -> ${role} (by ${adminId})`);

  const response = {
    status: 'success',
    data: {
      userId: result.userId,
      previousRole: result.previousRole,
      newRole: result.newRole,
      assignedBy: result.assignedBy,
    },
    timestamp: result.timestamp,
  };

  logger.info(`POST /assign-role response sent`);
  res.json(response);
});

// POST /remove-role - Remove role from user (SUPER_ADMIN only)
router.post('/remove-role', requireSuperAdmin(), async (req, res) => {
  logger.info('POST /remove-role endpoint called');
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  logger.debug('Request query:', JSON.stringify(req.query, null, 2));
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));

  const { userId, role } = req.body;
  const adminId = req.userId;

  logger.info(`Admin ${adminId} attempting to remove role from user ${userId}`);
  logger.debug(`Role to remove: ${role}`);

  if (!userId || !role) {
    logger.warn('Missing userId or role in POST /remove-role request');
    return res.status(400).json({
      error: 'User ID and role are required',
      code: 'MISSING_PARAMETERS',
    });
  }

  const result = roleBasedAccessControlService.removeRole(userId, role, adminId);

  if (!result.success) {
    logger.warn(`Role removal failed: ${result.error}`);
    return res.status(400).json({
      error: result.error,
      code: result.code,
    });
  }

  logger.info(`Role removed successfully: ${userId} (${role} -> ${result.newRole}) (by ${adminId})`);

  const response = {
    status: 'success',
    data: {
      userId: result.userId,
      removedRole: result.removedRole,
      newRole: result.newRole,
      removedBy: result.removedBy,
    },
    timestamp: result.timestamp,
  };

  logger.info(`POST /remove-role response sent`);
  res.json(response);
});

// GET /users-by-role - Get users by role (SUPER_ADMIN only)
router.get('/users-by-role', requireSuperAdmin(), async (req, res) => {
  logger.info('GET /users-by-role endpoint called');
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  logger.debug('Request query:', JSON.stringify(req.query, null, 2));
  logger.debug('Request body:', JSON.stringify(req.body, null, 2));

  const { role = 'USER' } = req.query;

  logger.info(`Fetching users by role: ${role}`);

  if (!role) {
    logger.warn('Role query parameter missing in GET /users-by-role');
    return res.status(400).json({
      error: 'Role query parameter is required',
      code: 'MISSING_ROLE',
    });
  }

  const validRoles = ['SUPER_ADMIN', 'USER'];
  if (!validRoles.includes(role)) {
    logger.warn(`Invalid role in GET /users-by-role: ${role}`);
    return res.status(400).json({
      error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      code: 'INVALID_ROLE',
    });
  }

  const result = roleBasedAccessControlService.getUsersByRole(role);

  logger.info(`Users by role retrieved: ${role} (${result.count} users)`);

  const response = {
    status: 'success',
    data: {
      role: result.role,
      users: result.users,
      count: result.count,
    },
    timestamp: result.timestamp,
  };

  logger.info(`GET /users-by-role response sent for role: ${role}`);
  res.json(response);
});

export default router;