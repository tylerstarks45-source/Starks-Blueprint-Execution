import express from 'express';
import {
  requireAuthenticatedUser,
  validateResourceOwnership,
  enforceUserResourceBoundary,
  validateUserCanAccessResource,
} from '../../middleware/authenticatedResourceAccess.js';
import { preventCrossUserAccess } from '../../middleware/crossUserAccessPrevention.js';
import userOwnershipValidationService from '../../services/security/UserOwnershipValidationService.js';
import resourceFilteringService from '../../services/security/ResourceFilteringService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply authentication and cross-user access prevention to all routes
router.use(requireAuthenticatedUser());
router.use(preventCrossUserAccess());
router.use(enforceUserResourceBoundary());

// ============================================================================
// SYSTEMS ENDPOINTS
// ============================================================================

// GET /my-systems - Returns authenticated user's systems only
router.get('/my-systems', async (req, res) => {
  try {
    const userId = req.authenticatedUserId;

    const systemsData = userOwnershipValidationService.getUserOwnedSystems(userId);
    const filtered = resourceFilteringService.filterSystemsByUser(userId, systemsData.systems);

    const response = {
      status: 'success',
      data: {
        userId,
        systems: filtered,
        count: filtered.length,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User systems retrieved: ${userId} (${filtered.length} systems)`);
    res.json(response);
  } catch (error) {
    logger.error('User systems retrieval error:', error.message);
    throw error;
  }
});

// GET /my-systems/:systemId - Returns specific system if user owns it
router.get('/my-systems/:systemId', validateResourceOwnership('system'), async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const systemId = req.params.systemId;

    // In real implementation, fetch from PocketBase
    const system = {
      id: systemId,
      userId,
      name: 'System',
      description: 'User system',
      createdAt: new Date().toISOString(),
    };

    const cleaned = resourceFilteringService.removeSensitiveFields(system, 'system');

    const response = {
      status: 'success',
      data: cleaned,
      timestamp: new Date().toISOString(),
    };

    logger.info(`User system retrieved: ${userId} - ${systemId}`);
    res.json(response);
  } catch (error) {
    logger.error('User system retrieval error:', error.message);
    throw error;
  }
});

// POST /my-systems - Creates system for authenticated user
router.post('/my-systems', async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'System name is required',
        code: 'MISSING_NAME',
      });
    }

    // Create system with authenticated user as owner
    const system = {
      id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId, // Force userId to authenticated user
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
    };

    const response = {
      status: 'success',
      data: system,
      timestamp: new Date().toISOString(),
    };

    logger.info(`System created: ${userId} - ${system.id}`);
    res.status(201).json(response);
  } catch (error) {
    logger.error('System creation error:', error.message);
    throw error;
  }
});

// PUT /my-systems/:systemId - Updates system if user owns it
router.put('/my-systems/:systemId', validateResourceOwnership('system'), async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const systemId = req.params.systemId;
    const { name, description } = req.body;

    // In real implementation, update in PocketBase
    const system = {
      id: systemId,
      userId,
      name: name || 'System',
      description: description || '',
      updatedAt: new Date().toISOString(),
    };

    const response = {
      status: 'success',
      data: system,
      timestamp: new Date().toISOString(),
    };

    logger.info(`System updated: ${userId} - ${systemId}`);
    res.json(response);
  } catch (error) {
    logger.error('System update error:', error.message);
    throw error;
  }
});

// DELETE /my-systems/:systemId - Deletes system if user owns it
router.delete('/my-systems/:systemId', validateResourceOwnership('system'), async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const systemId = req.params.systemId;

    // In real implementation, delete from PocketBase
    const response = {
      status: 'success',
      message: 'System deleted successfully',
      data: {
        userId,
        systemId,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`System deleted: ${userId} - ${systemId}`);
    res.json(response);
  } catch (error) {
    logger.error('System deletion error:', error.message);
    throw error;
  }
});

// ============================================================================
// AUTOMATIONS ENDPOINTS
// ============================================================================

// GET /my-automations - Returns user's automations only
router.get('/my-automations', async (req, res) => {
  try {
    const userId = req.authenticatedUserId;

    const automationsData = userOwnershipValidationService.getUserOwnedAutomations(userId);
    const filtered = resourceFilteringService.filterAutomationsByUser(userId, automationsData.automations);

    const response = {
      status: 'success',
      data: {
        userId,
        automations: filtered,
        count: filtered.length,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User automations retrieved: ${userId} (${filtered.length} automations)`);
    res.json(response);
  } catch (error) {
    logger.error('User automations retrieval error:', error.message);
    throw error;
  }
});

// GET /my-automations/:automationId - Returns specific automation if user owns it
router.get('/my-automations/:automationId', validateResourceOwnership('automation'), async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const automationId = req.params.automationId;

    // In real implementation, fetch from PocketBase
    const automation = {
      id: automationId,
      userId,
      name: 'Automation',
      description: 'User automation',
      createdAt: new Date().toISOString(),
    };

    const cleaned = resourceFilteringService.removeSensitiveFields(automation, 'automation');

    const response = {
      status: 'success',
      data: cleaned,
      timestamp: new Date().toISOString(),
    };

    logger.info(`User automation retrieved: ${userId} - ${automationId}`);
    res.json(response);
  } catch (error) {
    logger.error('User automation retrieval error:', error.message);
    throw error;
  }
});

// ============================================================================
// BLUEPRINTS ENDPOINTS
// ============================================================================

// GET /my-blueprints - Returns user's blueprints only
router.get('/my-blueprints', async (req, res) => {
  try {
    const userId = req.authenticatedUserId;

    const blueprintsData = userOwnershipValidationService.getUserOwnedBlueprints(userId);
    const filtered = resourceFilteringService.filterBlueprintsByUser(userId, blueprintsData.blueprints);

    const response = {
      status: 'success',
      data: {
        userId,
        blueprints: filtered,
        count: filtered.length,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User blueprints retrieved: ${userId} (${filtered.length} blueprints)`);
    res.json(response);
  } catch (error) {
    logger.error('User blueprints retrieval error:', error.message);
    throw error;
  }
});

// GET /my-blueprints/:blueprintId - Returns specific blueprint if user owns it
router.get('/my-blueprints/:blueprintId', validateResourceOwnership('blueprint'), async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const blueprintId = req.params.blueprintId;

    // In real implementation, fetch from PocketBase
    const blueprint = {
      id: blueprintId,
      userId,
      name: 'Blueprint',
      description: 'User blueprint',
      createdAt: new Date().toISOString(),
    };

    const cleaned = resourceFilteringService.removeSensitiveFields(blueprint, 'blueprint');

    const response = {
      status: 'success',
      data: cleaned,
      timestamp: new Date().toISOString(),
    };

    logger.info(`User blueprint retrieved: ${userId} - ${blueprintId}`);
    res.json(response);
  } catch (error) {
    logger.error('User blueprint retrieval error:', error.message);
    throw error;
  }
});

// ============================================================================
// CREDITS ENDPOINTS
// ============================================================================

// GET /my-credits - Returns user's credit balance only
router.get('/my-credits', async (req, res) => {
  try {
    const userId = req.authenticatedUserId;

    const creditsData = userOwnershipValidationService.getUserOwnedCredits(userId);

    const response = {
      status: 'success',
      data: creditsData,
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
// ANALYTICS ENDPOINTS
// ============================================================================

// GET /my-analytics - Returns user's analytics only
router.get('/my-analytics', async (req, res) => {
  try {
    const userId = req.authenticatedUserId;

    const analyticsData = userOwnershipValidationService.getUserOwnedAnalytics(userId);
    const filtered = resourceFilteringService.filterAnalyticsByUser(userId, analyticsData.analytics);

    const response = {
      status: 'success',
      data: {
        userId,
        analytics: filtered,
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
// ACTIVITY ENDPOINTS
// ============================================================================

// GET /my-activity - Returns user's activity only
router.get('/my-activity', async (req, res) => {
  try {
    const userId = req.authenticatedUserId;

    const activityData = userOwnershipValidationService.getUserOwnedActivity(userId);
    const filtered = resourceFilteringService.filterActivityByUser(userId, activityData.activities);

    const response = {
      status: 'success',
      data: {
        userId,
        activities: filtered,
        count: filtered.length,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User activity retrieved: ${userId} (${filtered.length} records)`);
    res.json(response);
  } catch (error) {
    logger.error('User activity retrieval error:', error.message);
    throw error;
  }
});

export default router;