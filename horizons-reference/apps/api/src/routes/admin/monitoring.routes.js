import express from 'express';
import { requireSuperAdmin } from '../../middleware/adminAuth.js';
import adminAnalyticsService from '../../services/admin/AdminAnalyticsService.js';
import adminDashboardDataService from '../../services/admin/AdminDashboardDataService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /dashboard-overview - Returns all dashboard metrics
router.get('/dashboard-overview', requireSuperAdmin(), async (req, res) => {
  try {
    const overview = adminDashboardDataService.getDashboardOverview();

    const response = {
      status: 'success',
      data: overview.data,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Dashboard overview retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Dashboard overview retrieval error:', error.message);
    throw error;
  }
});

// GET /metrics-snapshot - Returns real-time metrics snapshot
router.get('/metrics-snapshot', requireSuperAdmin(), async (req, res) => {
  try {
    const snapshot = adminDashboardDataService.getMetricsSnapshot();

    const response = {
      status: 'success',
      data: snapshot.data,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Metrics snapshot retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Metrics snapshot retrieval error:', error.message);
    throw error;
  }
});

// GET /metrics-trends - Returns metrics trends over time
router.get('/metrics-trends', requireSuperAdmin(), async (req, res) => {
  try {
    const { timeRange = 'day' } = req.query;
    const trends = adminDashboardDataService.getMetricsTrends(timeRange);

    const response = {
      status: 'success',
      timeRange: trends.timeRange,
      data: trends.data,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Metrics trends retrieved by admin: ${req.userId} (timeRange: ${timeRange})`);
    res.json(response);
  } catch (error) {
    logger.error('Metrics trends retrieval error:', error.message);
    throw error;
  }
});

// GET /user-analytics - Returns total users, active users, user growth, retention
router.get('/user-analytics', requireSuperAdmin(), async (req, res) => {
  try {
    const analytics = adminDashboardDataService.getDetailedAnalytics('users');

    const response = {
      status: 'success',
      data: {
        users: analytics.data,
        activity: analytics.activity,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User analytics retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('User analytics retrieval error:', error.message);
    throw error;
  }
});

// GET /system-analytics - Returns active systems, system types, status breakdown
router.get('/system-analytics', requireSuperAdmin(), async (req, res) => {
  try {
    const analytics = adminDashboardDataService.getDetailedAnalytics('systems');

    const response = {
      status: 'success',
      data: analytics.data,
      timestamp: new Date().toISOString(),
    };

    logger.info(`System analytics retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('System analytics retrieval error:', error.message);
    throw error;
  }
});

// GET /ai-usage-detailed - Returns detailed AI usage by model, user, time period
router.get('/ai-usage-detailed', requireSuperAdmin(), async (req, res) => {
  try {
    const analytics = adminDashboardDataService.getDetailedAnalytics('ai-usage');

    const response = {
      status: 'success',
      data: {
        usage: analytics.usage,
        tokens: analytics.tokens,
        requests: analytics.requests,
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

// GET /subscription-analytics - Returns subscription data, tiers, churn rate, revenue metrics
router.get('/subscription-analytics', requireSuperAdmin(), async (req, res) => {
  try {
    const analytics = adminDashboardDataService.getDetailedAnalytics('subscriptions');

    const response = {
      status: 'success',
      data: {
        subscriptions: analytics.metrics,
        revenue: analytics.revenue,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Subscription analytics retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Subscription analytics retrieval error:', error.message);
    throw error;
  }
});

// GET /error-analytics - Returns error tracking, error types, recovery status, trends
router.get('/error-analytics', requireSuperAdmin(), async (req, res) => {
  try {
    const analytics = adminDashboardDataService.getDetailedAnalytics('errors');

    const response = {
      status: 'success',
      data: analytics.data,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Error analytics retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Error analytics retrieval error:', error.message);
    throw error;
  }
});

// GET /infrastructure-analytics - Returns AI infrastructure status, health, performance metrics
router.get('/infrastructure-analytics', requireSuperAdmin(), async (req, res) => {
  try {
    const analytics = adminDashboardDataService.getDetailedAnalytics('infrastructure');

    const response = {
      status: 'success',
      data: {
        aiStatus: analytics.aiStatus,
        health: analytics.health,
        openRouter: analytics.openRouter,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Infrastructure analytics retrieved by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Infrastructure analytics retrieval error:', error.message);
    throw error;
  }
});

// GET /activity-logs - Returns platform-wide logs
router.get('/activity-logs', requireSuperAdmin(), async (req, res) => {
  try {
    const { type = 'all', limit = 100 } = req.query;
    const logs = adminAnalyticsService.getPlatformWideLogs(type, parseInt(limit, 10));

    const response = {
      status: 'success',
      data: {
        logs: logs.logs,
        summary: logs.summary,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Activity logs retrieved by admin: ${req.userId} (type: ${type}, limit: ${limit})`);
    res.json(response);
  } catch (error) {
    logger.error('Activity logs retrieval error:', error.message);
    throw error;
  }
});

// POST /refresh-analytics - Refreshes all analytics data
router.post('/refresh-analytics', requireSuperAdmin(), async (req, res) => {
  try {
    const result = adminDashboardDataService.refreshDashboardData();

    const response = {
      status: 'success',
      data: result,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Analytics refreshed by admin: ${req.userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Analytics refresh error:', error.message);
    throw error;
  }
});

export default router;