import initialSetupService from '../services/setup/InitialSetupService.js';
import logger from '../utils/logger.js';

function requireInitialization() {
  return (req, res, next) => {
    const initialized = initialSetupService.isPlatformInitialized();

    if (!initialized) {
      logger.warn('Request received but platform not initialized');
      return res.status(503).json({
        error: 'Service unavailable: Platform is not initialized',
        code: 'PLATFORM_NOT_INITIALIZED',
        message: 'Please complete the platform setup process',
      });
    }

    next();
  };
}

function allowOnlyIfNotInitialized() {
  return (req, res, next) => {
    const initialized = initialSetupService.isPlatformInitialized();

    if (initialized) {
      logger.warn('Setup request received but platform already initialized');
      return res.status(409).json({
        error: 'Conflict: Platform is already initialized',
        code: 'PLATFORM_ALREADY_INITIALIZED',
        message: 'Platform setup has already been completed. Re-initialization is not allowed.',
      });
    }

    next();
  };
}

function checkInitializationStatus() {
  const initialized = initialSetupService.isPlatformInitialized();
  const status = initialSetupService.getInitializationStatus();

  return {
    initialized,
    setupComplete: status.setupComplete,
    superAdminExists: status.superAdminExists,
    timestamp: new Date().toISOString(),
  };
}

export {
  requireInitialization,
  allowOnlyIfNotInitialized,
  checkInitializationStatus,
};