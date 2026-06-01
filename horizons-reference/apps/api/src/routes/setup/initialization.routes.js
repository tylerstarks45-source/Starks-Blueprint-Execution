import express from 'express';
import { allowOnlyIfNotInitialized } from '../../middleware/initialization.js';
import initialSetupService from '../../services/setup/InitialSetupService.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// GET /initialization-status - Returns platform initialization status (public, no auth required)
router.get('/initialization-status', async (req, res) => {
  const status = initialSetupService.getInitializationStatus();

  const response = {
    status: 'success',
    data: {
      initialized: status.initialized,
      setupComplete: status.setupComplete,
      superAdminExists: status.superAdminExists,
      setupTimestamp: status.setupTimestamp,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info('Initialization status retrieved');
  res.json(response);
});

// POST /initialize-platform - Initialize platform with Super Admin (public, one-time only)
router.post('/initialize-platform', allowOnlyIfNotInitialized(), async (req, res) => {
  const { superAdminEmail, superAdminPassword } = req.body;

  if (!superAdminEmail || !superAdminPassword) {
    return res.status(400).json({
      error: 'Super Admin email and password are required',
      code: 'MISSING_CREDENTIALS',
    });
  }

  if (typeof superAdminEmail !== 'string' || typeof superAdminPassword !== 'string') {
    return res.status(400).json({
      error: 'Super Admin email and password must be strings',
      code: 'INVALID_CREDENTIALS_TYPE',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(superAdminEmail)) {
    return res.status(400).json({
      error: 'Invalid email format',
      code: 'INVALID_EMAIL_FORMAT',
    });
  }

  // Validate password strength
  if (superAdminPassword.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
      code: 'WEAK_PASSWORD',
    });
  }

  // Initialize platform
  const result = initialSetupService.initializePlatform(superAdminEmail, superAdminPassword);

  const response = {
    status: 'success',
    data: {
      initialized: true,
      superAdminCreated: result.superAdminCreated,
      superAdminEmail: result.superAdminEmail,
      setupTimestamp: result.setupTimestamp,
      message: result.message,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(`Platform initialized with Super Admin: ${superAdminEmail}`);
  res.json(response);
});

export default router;