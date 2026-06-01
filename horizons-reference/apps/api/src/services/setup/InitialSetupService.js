import 'dotenv/config';
import logger from '../../utils/logger.js';
import superAdminAccountService from '../admin/SuperAdminAccountService.js';

class InitialSetupService {
  constructor() {
    this.initialized = false;
    this.setupComplete = false;
    this.setupTimestamp = null;
    this.setupLog = [];
    this.maxSetupLogEntries = 100;
    logger.info('Initial Setup Service initialized');
  }

  isPlatformInitialized() {
    const superAdminExists = superAdminAccountService.validateSuperAdminExists();
    this.initialized = superAdminExists;
    return this.initialized;
  }

  initializePlatform(superAdminEmail, superAdminPassword) {
    if (!superAdminEmail || !superAdminPassword) {
      throw new Error('Super Admin email and password are required');
    }

    // Check if already initialized
    if (this.isPlatformInitialized()) {
      logger.error('Platform already initialized. Cannot re-initialize.');
      throw new Error('Platform is already initialized. Re-initialization is not allowed.');
    }

    // Check if setup is already in progress
    if (this.setupComplete) {
      logger.error('Platform setup already completed. Cannot re-initialize.');
      throw new Error('Platform setup has already been completed. Re-initialization is not allowed.');
    }

    try {
      // Create initial Super Admin account
      const superAdminResult = superAdminAccountService.createInitialSuperAdmin(
        superAdminEmail,
        superAdminPassword
      );

      if (!superAdminResult.success) {
        throw new Error('Failed to create Super Admin account');
      }

      // Mark setup as complete
      this.initialized = true;
      this.setupComplete = true;
      this.setupTimestamp = new Date().toISOString();

      // Log setup completion
      this.logSetupEvent('PLATFORM_INITIALIZED', {
        superAdminEmail,
        superAdminId: superAdminResult.userId,
      });

      logger.info('Platform initialization completed successfully');

      return {
        success: true,
        message: 'Platform initialized successfully',
        superAdminCreated: true,
        superAdminEmail,
        setupTimestamp: this.setupTimestamp,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Platform initialization failed: ${error.message}`);
      this.logSetupEvent('PLATFORM_INITIALIZATION_FAILED', { error: error.message });
      throw error;
    }
  }

  getInitializationStatus() {
    const initialized = this.isPlatformInitialized();
    const superAdminAccount = superAdminAccountService.getSuperAdminAccount();

    return {
      initialized,
      setupComplete: this.setupComplete,
      superAdminExists: superAdminAccount !== null,
      superAdminEmail: superAdminAccount?.email || null,
      setupTimestamp: this.setupTimestamp,
      timestamp: new Date().toISOString(),
    };
  }

  validateInitialization() {
    if (!this.isPlatformInitialized()) {
      logger.error('Platform not initialized');
      throw new Error('Platform is not initialized. Please complete the setup process.');
    }

    return {
      valid: true,
      message: 'Platform is initialized',
      code: 'PLATFORM_INITIALIZED',
      timestamp: new Date().toISOString(),
    };
  }

  logSetupEvent(event, details = {}) {
    if (!event || typeof event !== 'string') {
      logger.warn('Invalid setup event logging parameters');
      return null;
    }

    const logEntry = {
      id: `setup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      details,
      timestamp: new Date().toISOString(),
    };

    this.setupLog.push(logEntry);

    // Keep only last 100 entries
    if (this.setupLog.length > this.maxSetupLogEntries) {
      this.setupLog = this.setupLog.slice(-this.maxSetupLogEntries);
    }

    logger.info(`Setup event logged: ${event}`);
    return logEntry;
  }

  getSetupLog(limit = 50) {
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      limit = 50;
    }

    return {
      log: this.setupLog.slice(-limit),
      count: this.setupLog.length,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  resetSetupState() {
    // This should only be called in development/testing
    logger.warn('Setup state reset requested');
    this.initialized = false;
    this.setupComplete = false;
    this.setupTimestamp = null;
    this.setupLog = [];
    return {
      success: true,
      message: 'Setup state reset',
      timestamp: new Date().toISOString(),
    };
  }
}

const initialSetupService = new InitialSetupService();

export default initialSetupService;
export { InitialSetupService };