import express from 'express';
import { requireUserRole, blockAdminAccessToUserEndpoints } from '../../middleware/userEndpointProtection.js';
import roleAwareEndpointProtectionService from '../../services/security/RoleAwareEndpointProtectionService.js';
import roleBasedEndpointRegistry from '../../services/security/RoleBasedEndpointRegistry.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply User role protection to all routes
router.use(requireUserRole());
router.use(blockAdminAccessToUserEndpoints());

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

// GET /my-profile - Returns user's profile
router.get('/my-profile', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        email: 'user@example.com',
        role: 'USER',
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User profile retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User profile retrieval error:', error.message);
    throw error;
  }
});

// PUT /my-profile - Updates user's profile
router.put('/my-profile', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    const { email, name } = req.body;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        email: email || 'user@example.com',
        name: name || 'User',
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User profile updated: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User profile update error:', error.message);
    throw error;
  }
});

// ============================================================================
// USER SUBSCRIPTION ENDPOINTS
// ============================================================================

// GET /my-subscription - Returns user's subscription
router.get('/my-subscription', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        tier: 'starter',
        status: 'active',
        renewalDate: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User subscription retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User subscription retrieval error:', error.message);
    throw error;
  }
});

// GET /my-credits - Returns user's credits
router.get('/my-credits', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        balance: 10000,
        monthlyAllocation: 10000,
        tier: 'starter',
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User credits retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User credits retrieval error:', error.message);
    throw error;
  }
});

// ============================================================================
// USER RESOURCES ENDPOINTS
// ============================================================================

// GET /my-systems - Returns user's systems
router.get('/my-systems', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        systems: [],
        count: 0,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User systems retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User systems retrieval error:', error.message);
    throw error;
  }
});

// GET /my-automations - Returns user's automations
router.get('/my-automations', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        automations: [],
        count: 0,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User automations retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User automations retrieval error:', error.message);
    throw error;
  }
});

// GET /my-blueprints - Returns user's blueprints
router.get('/my-blueprints', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        blueprints: [],
        count: 0,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User blueprints retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User blueprints retrieval error:', error.message);
    throw error;
  }
});

// GET /my-analytics - Returns user's analytics
router.get('/my-analytics', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    const response = {
      status: 'success',
      data: {
        userId,
        analytics: {
          systems: 0,
          automations: 0,
          blueprints: 0,
        },
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User analytics retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User analytics retrieval error:', error.message);
    throw error;
  }
});

// ============================================================================
// USER CREATION ENDPOINTS
// ============================================================================

// POST /create-system - Creates system for user
router.post('/create-system', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    const { name, description } = req.body;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    if (!name) {
      return res.status(400).json({
        error: 'System name is required',
        code: 'MISSING_NAME',
      });
    }

    const response = {
      status: 'success',
      data: {
        systemId: `system-${Date.now()}`,
        userId,
        name,
        description: description || '',
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`System created by user: ${userId}`);
    res.status(201).json(response);
  } catch (error) {
    logger.error('System creation error:', error.message);
    throw error;
  }
});

// POST /create-automation - Creates automation for user
router.post('/create-automation', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    const { name, description } = req.body;

    // Validate USER role
    roleAwareEndpointProtectionService.validateUserRole(userId);

    if (!name) {
      return res.status(400).json({
        error: 'Automation name is required',
        code: 'MISSING_NAME',
      });
    }

    const response = {
      status: 'success',
      data: {
        automationId: `automation-${Date.now()}`,
        userId,
        name,
        description: description || '',
        createdAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Automation created by user: ${userId}`);
    res.status(201).json(response);
  } catch (error) {
    logger.error('Automation creation error:', error.message);
    throw error;
  }
});

export default router;