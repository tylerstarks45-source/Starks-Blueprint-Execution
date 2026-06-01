import express from 'express';
import { requireSuperAdmin } from '../../middleware/superAdminProtection.js';
import { requireAuthenticatedUser } from '../../middleware/authenticatedResourceAccess.js';
import aiTokenTrackingService from '../../services/ai/AITokenTrackingService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /user/:userId - Get user AI usage (admin or user's own data)
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const authenticatedUserId = req.user?.id || req.auth?.id || req.userId;
  const userRole = req.user?.role || req.auth?.role;

  if (!userId) {
    return res.status(400).json({
      error: 'User ID is required',
      code: 'MISSING_USER_ID',
    });
  }

  // Allow access if user is admin or accessing their own data
  const isAdmin = userRole === 'SUPER_ADMIN';
  const isOwnData = userId === authenticatedUserId;

  if (!isAdmin && !isOwnData) {
    throw new Error('Unauthorized: Cannot access other users AI usage data');
  }

  const usage = aiTokenTrackingService.getTokenUsageByUser(userId);

  logger.info(`AI usage retrieved for user: ${userId}`);

  res.json({
    status: 'success',
    data: usage,
    timestamp: new Date().toISOString(),
  });
});

// GET /platform - Get platform-wide AI usage (admin only)
router.get('/platform', requireSuperAdmin(), async (req, res) => {
  const stats = aiTokenTrackingService.getTokenUsageStats();

  logger.info('Platform-wide AI usage retrieved');

  res.json({
    status: 'success',
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

// GET /by-model - Get usage by model (admin only)
router.get('/by-model', requireSuperAdmin(), async (req, res) => {
  const { model } = req.query;

  if (!model) {
    return res.status(400).json({
      error: 'Model parameter is required',
      code: 'MISSING_MODEL',
    });
  }

  const usage = aiTokenTrackingService.getTokenUsageByModel(model);

  logger.info(`AI usage retrieved for model: ${model}`);

  res.json({
    status: 'success',
    data: usage,
    timestamp: new Date().toISOString(),
  });
});

// GET /by-date - Get usage by date range (admin only)
router.get('/by-date', requireSuperAdmin(), async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'startDate and endDate parameters are required',
      code: 'MISSING_DATE_RANGE',
    });
  }

  const usage = aiTokenTrackingService.getTokenUsageByDateRange(startDate, endDate);

  logger.info(`AI usage retrieved for date range: ${startDate} to ${endDate}`);

  res.json({
    status: 'success',
    data: usage,
    timestamp: new Date().toISOString(),
  });
});

export default router;