import express from 'express';
import { requireSuperAdmin } from '../../middleware/superAdminProtection.js';
import auditLogService from '../../services/audit/AuditLogService.js';
import suspiciousActivityDetectionService from '../../services/audit/SuspiciousActivityDetectionService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply Super Admin protection to all routes
router.use(requireSuperAdmin());

// GET /audit-logs - Returns audit logs with filters and pagination
router.get('/audit-logs', async (req, res) => {
  try {
    const { userId, action, type, severity, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Build filters
    const filters = {};
    if (userId && typeof userId === 'string') filters.userId = userId;
    if (action && typeof action === 'string') filters.action = action;
    if (type && typeof type === 'string') filters.type = type;
    if (severity && typeof severity === 'string') filters.severity = severity;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    // Retrieve logs
    const allLogs = auditLogService.getAuditLog(filters).logs;

    // Apply pagination
    const totalCount = allLogs.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedLogs = allLogs.slice(startIndex, startIndex + limitNum);

    logger.info(`Audit logs retrieved: ${paginatedLogs.length} logs (page ${pageNum}/${totalPages})`);

    res.json({
      status: 'success',
      data: paginatedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Audit logs retrieval error:', error.message);
    throw error;
  }
});

// GET /audit-logs/:logId - Returns specific audit log
router.get('/audit-logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;

    if (!logId || typeof logId !== 'string') {
      return res.status(400).json({
        error: 'Log ID is required',
        code: 'MISSING_LOG_ID',
      });
    }

    // Retrieve all logs and find the one with matching ID
    const allLogs = auditLogService.getAuditLog({}).logs;
    const log = allLogs.find(l => l.id === logId);

    if (!log) {
      return res.status(404).json({
        error: 'Audit log not found',
        code: 'LOG_NOT_FOUND',
        logId,
      });
    }

    logger.info(`Audit log retrieved: ${logId}`);

    res.json({
      status: 'success',
      data: log,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Audit log retrieval error:', error.message);
    throw error;
  }
});

// GET /audit-logs/user/:userId - Returns logs for specific user
router.get('/audit-logs/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Retrieve logs for user
    const allLogs = auditLogService.getAuditLog({ userId }).logs;

    // Apply pagination
    const totalCount = allLogs.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedLogs = allLogs.slice(startIndex, startIndex + limitNum);

    logger.info(`User audit logs retrieved: ${userId} - ${paginatedLogs.length} logs`);

    res.json({
      status: 'success',
      userId,
      data: paginatedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('User audit logs retrieval error:', error.message);
    throw error;
  }
});

// GET /audit-logs/action/:action - Returns logs by action
router.get('/audit-logs/action/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!action || typeof action !== 'string') {
      return res.status(400).json({
        error: 'Action is required',
        code: 'MISSING_ACTION',
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Retrieve logs by action
    const allLogs = auditLogService.getAuditLog({ action }).logs;

    // Apply pagination
    const totalCount = allLogs.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedLogs = allLogs.slice(startIndex, startIndex + limitNum);

    logger.info(`Action audit logs retrieved: ${action} - ${paginatedLogs.length} logs`);

    res.json({
      status: 'success',
      action,
      data: paginatedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Action audit logs retrieval error:', error.message);
    throw error;
  }
});

// GET /suspicious-activity - Returns suspicious activity logs
router.get('/suspicious-activity', async (req, res) => {
  try {
    const { userId, severity, activity, page = 1, limit = 50 } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Build filters
    const filters = {};
    if (userId && typeof userId === 'string') filters.userId = userId;
    if (severity && typeof severity === 'string') filters.severity = severity;
    if (activity && typeof activity === 'string') filters.activity = activity;

    // Retrieve suspicious activities
    const result = suspiciousActivityDetectionService.getSuspiciousActivityLog(filters);
    const allActivities = result.activities;

    // Apply pagination
    const totalCount = allActivities.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedActivities = allActivities.slice(startIndex, startIndex + limitNum);

    logger.info(`Suspicious activities retrieved: ${paginatedActivities.length} activities`);

    res.json({
      status: 'success',
      data: paginatedActivities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Suspicious activity retrieval error:', error.message);
    throw error;
  }
});

// GET /login-attempts/:email - Returns login attempts for email
router.get('/login-attempts/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL',
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Retrieve login attempts for email
    const allLogs = auditLogService.getAuditLog({ type: 'login-attempt' }).logs;
    const emailLogs = allLogs.filter(log => log.email === email);

    // Apply pagination
    const totalCount = emailLogs.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedLogs = emailLogs.slice(startIndex, startIndex + limitNum);

    // Count successful and failed attempts
    const successfulAttempts = emailLogs.filter(log => log.success).length;
    const failedAttempts = emailLogs.filter(log => !log.success).length;

    logger.info(`Login attempts retrieved: ${email} - ${paginatedLogs.length} attempts`);

    res.json({
      status: 'success',
      email,
      data: paginatedLogs,
      summary: {
        totalAttempts: totalCount,
        successfulAttempts,
        failedAttempts,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Login attempts retrieval error:', error.message);
    throw error;
  }
});

export default router;