import express from 'express';
import { requireAuth } from '../../middleware/adminAuth.js';
import userIsolationService from '../../services/user/UserIsolationService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /my-workspace - Returns user's isolated workspace
router.get('/my-workspace', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;

    // Enforce user isolation
    const isolation = userIsolationService.enforceUserBoundary(userId, { userId });
    if (!isolation.enforced) {
      return res.status(403).json({
        error: isolation.error,
        code: isolation.code,
      });
    }

    const workspace = userIsolationService.getUserWorkspace(userId);

    const response = {
      status: 'success',
      data: {
        workspaceId: workspace.workspaceId,
        userId: workspace.userId,
        resources: {
          systems: workspace.systems,
          automations: workspace.automations,
          blueprints: workspace.blueprints,
          deployments: workspace.deployments,
          executions: workspace.executions,
        },
        metadata: workspace.metadata,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User workspace retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User workspace retrieval error:', error.message);
    throw error;
  }
});

// GET /my-systems - Returns user's isolated systems only
router.get('/my-systems', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;

    // Enforce user isolation
    const isolation = userIsolationService.enforceUserBoundary(userId, { userId });
    if (!isolation.enforced) {
      return res.status(403).json({
        error: isolation.error,
        code: isolation.code,
      });
    }

    const systems = userIsolationService.isolateUserSystems(userId);

    const response = {
      status: 'success',
      data: {
        userId: systems.userId,
        systems: systems.systems,
        count: systems.count,
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

// GET /my-automations - Returns user's isolated automations only
router.get('/my-automations', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;

    // Enforce user isolation
    const isolation = userIsolationService.enforceUserBoundary(userId, { userId });
    if (!isolation.enforced) {
      return res.status(403).json({
        error: isolation.error,
        code: isolation.code,
      });
    }

    const automations = userIsolationService.isolateUserAutomations(userId);

    const response = {
      status: 'success',
      data: {
        userId: automations.userId,
        automations: automations.automations,
        count: automations.count,
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

// GET /my-blueprints - Returns user's isolated blueprints only
router.get('/my-blueprints', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;

    // Enforce user isolation
    const isolation = userIsolationService.enforceUserBoundary(userId, { userId });
    if (!isolation.enforced) {
      return res.status(403).json({
        error: isolation.error,
        code: isolation.code,
      });
    }

    const blueprints = userIsolationService.isolateUserBlueprints(userId);

    const response = {
      status: 'success',
      data: {
        userId: blueprints.userId,
        blueprints: blueprints.blueprints,
        count: blueprints.count,
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

// GET /my-usage-analytics - Returns user's isolated usage analytics only
router.get('/my-usage-analytics', requireAuth(), async (req, res) => {
  try {
    const userId = req.userId;

    // Enforce user isolation
    const isolation = userIsolationService.enforceUserBoundary(userId, { userId });
    if (!isolation.enforced) {
      return res.status(403).json({
        error: isolation.error,
        code: isolation.code,
      });
    }

    const analytics = userIsolationService.isolateUserUsageAnalytics(userId);

    const response = {
      status: 'success',
      data: {
        userId: analytics.userId,
        analytics: analytics.analytics,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User usage analytics retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User usage analytics retrieval error:', error.message);
    throw error;
  }
});

export default router;