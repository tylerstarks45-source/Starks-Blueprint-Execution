import express from 'express';
import { requireSuperAdmin } from '../../middleware/adminAuth.js';
import adminInfrastructureService from '../../services/admin/AdminInfrastructureService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /platform-status - Returns OpenRouter health, active sessions, token usage, system health
router.get('/platform-status', requireSuperAdmin(), async (req, res) => {
  try {
    const systemHealth = adminInfrastructureService.getSystemHealth();

    const response = {
      status: 'success',
      data: {
        platformStatus: systemHealth.status,
        infrastructure: systemHealth.infrastructure,
        components: {
          starksAIEngine: systemHealth.components.openRouterHealth,
          activeSessions: systemHealth.components.activeSessions,
          tokenUsage: systemHealth.components.platformUsage,
        },
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Platform status retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Platform status retrieval error:', error.message);
    throw error;
  }
});

// GET /ai-usage-analytics - Returns total tokens, request count, model breakdown, error rates
router.get('/ai-usage-analytics', requireSuperAdmin(), async (req, res) => {
  try {
    const analytics = adminInfrastructureService.getRequestAnalytics();

    const response = {
      status: 'success',
      data: {
        analytics: analytics.analytics,
        topModels: analytics.topModels,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`AI usage analytics retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('AI usage analytics retrieval error:', error.message);
    throw error;
  }
});

// GET /active-sessions - Returns active AI sessions, session duration, models in use
router.get('/active-sessions', requireSuperAdmin(), async (req, res) => {
  try {
    const sessions = adminInfrastructureService.getActiveAISessions();

    const response = {
      status: 'success',
      data: {
        activeSessions: sessions.activeSessions,
        maxCapacity: sessions.maxCapacity,
        utilizationPercent: sessions.utilizationPercent,
        sessions: sessions.sessions,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Active sessions retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Active sessions retrieval error:', error.message);
    throw error;
  }
});

// GET /error-monitoring - Returns platform errors, error categories, recovery status
router.get('/error-monitoring', requireSuperAdmin(), async (req, res) => {
  try {
    const errorMonitoring = adminInfrastructureService.getErrorMonitoring();

    const response = {
      status: 'success',
      data: {
        totalErrors: errorMonitoring.monitoring.totalErrors,
        errorCategories: errorMonitoring.monitoring.errorCategories,
        recentErrors: errorMonitoring.monitoring.recentErrors,
        recoveryStatus: errorMonitoring.recoveryStatus,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Error monitoring data retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Error monitoring retrieval error:', error.message);
    throw error;
  }
});

// GET /infrastructure-health - Returns OpenRouter status, API health, response times, uptime
router.get('/infrastructure-health', requireSuperAdmin(), async (req, res) => {
  try {
    const openRouterHealth = adminInfrastructureService.getOpenRouterHealth();
    const tokenConsumption = adminInfrastructureService.getTokenConsumption();

    const response = {
      status: 'success',
      data: {
        infrastructure: 'Starks AI Engine',
        health: openRouterHealth.health,
        stats: openRouterHealth.stats,
        consumption: tokenConsumption.consumption,
        metrics: tokenConsumption.metrics,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Infrastructure health retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Infrastructure health retrieval error:', error.message);
    throw error;
  }
});

// POST /test-centralized-ai - Tests centralized AI infrastructure
router.post('/test-centralized-ai', requireSuperAdmin(), async (req, res) => {
  try {
    const testResult = adminInfrastructureService.testCentralizedInfrastructure();

    const response = {
      status: 'success',
      data: {
        infrastructure: testResult.infrastructure,
        connectionStatus: testResult.success ? 'connected' : 'disconnected',
        components: testResult.components,
        availableModels: testResult.availableModels,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Centralized AI infrastructure test performed by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Centralized AI infrastructure test error:', error.message);
    throw error;
  }
});

export default router;