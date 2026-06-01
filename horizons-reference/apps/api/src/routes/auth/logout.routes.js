import express from 'express';
import { validateSession } from '../../middleware/sessionValidation.js';
import enhancedSessionManagementService from '../../services/auth/EnhancedSessionManagementService.js';
import logoutCleanupService from '../../services/auth/LogoutCleanupService.js';
import sessionExpirationService from '../../services/auth/SessionExpirationService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply session validation to all routes
router.use(validateSession());

// ============================================================================
// LOGOUT ENDPOINTS
// ============================================================================

// POST /logout - Logs out current user
router.post('/logout', async (req, res) => {
  try {
    const sessionToken = req.sessionToken;
    const userId = req.user?.id || req.auth?.id;

    if (!sessionToken || !userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION',
      });
    }

    // Perform complete logout
    const result = logoutCleanupService.performLogout(sessionToken);

    const response = {
      status: 'success',
      message: 'Logged out successfully',
      data: {
        userId,
        sessionToken: sessionToken.substring(0, 20) + '...',
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`User logged out: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Logout error:', error.message);
    throw error;
  }
});

// POST /logout-all - Logs out all sessions for user
router.post('/logout-all', async (req, res) => {
  try {
    const userId = req.user?.id || req.auth?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_USER_ID',
      });
    }

    // Cleanup all user sessions
    const result = logoutCleanupService.cleanupUserSessions(userId);

    const response = {
      status: 'success',
      message: 'All sessions logged out',
      data: {
        userId,
        invalidatedCount: result.invalidatedCount,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`All sessions logged out for user: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Logout all error:', error.message);
    throw error;
  }
});

// ============================================================================
// SESSION STATUS ENDPOINTS
// ============================================================================

// GET /session-status - Returns current session status
router.get('/session-status', async (req, res) => {
  try {
    const sessionToken = req.sessionToken;
    const userId = req.user?.id || req.auth?.id;

    if (!sessionToken || !userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION',
      });
    }

    // Get session metadata
    const metadata = enhancedSessionManagementService.getSessionMetadata(sessionToken);

    // Get time remaining
    const timeRemaining = sessionExpirationService.getSessionTimeRemaining(sessionToken);

    const response = {
      status: 'success',
      data: {
        active: metadata.active,
        userId: metadata.userId,
        role: metadata.role,
        createdAt: metadata.createdAt,
        lastActivity: metadata.lastActivity,
        expiresAt: metadata.expiresAt,
        timeRemaining: timeRemaining.timeRemaining,
        timeRemainingMinutes: timeRemaining.timeRemainingMinutes,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Session status retrieved: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Session status retrieval error:', error.message);
    throw error;
  }
});

// POST /validate-session - Validates current session
router.post('/validate-session', async (req, res) => {
  try {
    const sessionToken = req.sessionToken;
    const userId = req.user?.id || req.auth?.id;

    if (!sessionToken || !userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_SESSION',
      });
    }

    // Validate session integrity
    enhancedSessionManagementService.validateSessionIntegrity(sessionToken);

    // Validate session is not expired
    enhancedSessionManagementService.validateSessionExpiration(sessionToken);

    // Get time remaining
    const timeRemaining = sessionExpirationService.getSessionTimeRemaining(sessionToken);

    const response = {
      status: 'success',
      data: {
        valid: true,
        userId,
        expiresAt: timeRemaining.expiresAt,
        timeRemaining: timeRemaining.timeRemaining,
        timeRemainingMinutes: timeRemaining.timeRemainingMinutes,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Session validated: ${userId}`);
    res.json(response);
  } catch (error) {
    logger.error('Session validation error:', error.message);
    throw error;
  }
});

export default router;