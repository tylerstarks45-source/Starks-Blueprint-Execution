import 'dotenv/config';
import logger from '../../utils/logger.js';
import roleBasedAccessControlService from './RoleBasedAccessControlService.js';

class EnhancedAuthService {
  constructor() {
    this.sessions = new Map();
    this.loginHistory = new Map();
    this.sessionIdCounter = 0;
    this.sessionExpirationMs = 24 * 60 * 60 * 1000; // 24 hours
    this.maxLoginAttempts = 5;
    this.lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
    this.accountLockouts = new Map();
    this.initialized = true;
    logger.info('Enhanced Auth Service initialized');
  }

  authenticateUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('Email and password must be strings');
    }

    // Check if account is locked
    const lockout = this.accountLockouts.get(email);
    if (lockout && Date.now() < lockout.expiresAt) {
      const minutesRemaining = Math.ceil((lockout.expiresAt - Date.now()) / 60000);
      logger.warn(`Account locked: ${email} (${minutesRemaining} minutes remaining)`);
      throw new Error(`Account is locked. Try again in ${minutesRemaining} minutes.`);
    }

    // In a real implementation, this would validate against PocketBase
    // For now, we'll simulate authentication
    const isValid = this.validateCredentials(email, password);

    if (!isValid) {
      this.recordFailedLoginAttempt(email);
      throw new Error('Invalid email or password');
    }

    // Clear failed attempts on successful login
    this.accountLockouts.delete(email);

    // Extract userId from email (in real implementation, fetch from PocketBase)
    const userId = this.extractUserIdFromEmail(email);

    // Get user role
    const userRoleData = roleBasedAccessControlService.getUserRole(userId);
    const role = userRoleData.role;

    // Track successful login
    this.trackLoginAttempt(email, true);

    logger.info(`User authenticated: ${userId} (role: ${role})`);

    return {
      success: true,
      user: {
        id: userId,
        email,
        name: '',
        role,
      },
      userId,
      role,
      timestamp: new Date().toISOString(),
    };
  }

  createSession(userId, role) {
    if (!userId || !role) {
      throw new Error('User ID and role are required');
    }

    // Invalidate any existing sessions for this user
    this.invalidateAllUserSessions(userId);

    const sessionToken = this.generateSessionToken();
    const now = Date.now();
    const expiresAt = now + this.sessionExpirationMs;

    const session = {
      sessionToken,
      userId,
      role,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      lastActivity: now,
      metadata: {
        ipAddress: null,
        userAgent: null,
      },
    };

    this.sessions.set(sessionToken, session);

    logger.info(`Session created: ${sessionToken} (user: ${userId}, role: ${role})`);

    return {
      sessionToken,
      userId,
      role,
      expiresAt: session.expiresAt,
      expiresIn: this.sessionExpirationMs,
      timestamp: new Date().toISOString(),
    };
  }

  validateSession(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      return {
        valid: false,
        error: 'Session token is required and must be a string',
        code: 'INVALID_TOKEN',
      };
    }

    const session = this.sessions.get(sessionToken);

    if (!session) {
      logger.warn(`Session validation failed: token not found`);
      return {
        valid: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      };
    }

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();

    if (now > expiresAt) {
      this.sessions.delete(sessionToken);
      logger.warn(`Session validation failed: token expired (${session.userId})`);
      return {
        valid: false,
        error: 'Session has expired',
        code: 'SESSION_EXPIRED',
      };
    }

    // Update last activity
    session.lastActivity = now;

    return {
      valid: true,
      sessionToken,
      userId: session.userId,
      role: session.role,
      expiresAt: session.expiresAt,
      code: 'SESSION_VALID',
    };
  }

  getSessionRole(sessionToken) {
    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    const validation = this.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const session = this.sessions.get(sessionToken);
    return {
      sessionToken,
      userId: session.userId,
      role: session.role,
      timestamp: new Date().toISOString(),
    };
  }

  getUserFromSession(sessionToken) {
    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    const validation = this.validateSession(sessionToken);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const session = this.sessions.get(sessionToken);
    return {
      sessionToken,
      userId: session.userId,
      role: session.role,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      timestamp: new Date().toISOString(),
    };
  }

  invalidateSession(sessionToken) {
    if (!sessionToken) {
      return {
        success: false,
        error: 'Session token is required',
      };
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    this.sessions.delete(sessionToken);
    logger.info(`Session invalidated: ${sessionToken} (user: ${session.userId})`);

    return {
      success: true,
      sessionToken,
      userId: session.userId,
      timestamp: new Date().toISOString(),
    };
  }

  invalidateAllUserSessions(userId) {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    let invalidatedCount = 0;
    const sessionsToDelete = [];

    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        sessionsToDelete.push(token);
        invalidatedCount += 1;
      }
    }

    sessionsToDelete.forEach(token => this.sessions.delete(token));

    if (invalidatedCount > 0) {
      logger.info(`All sessions invalidated for user: ${userId} (${invalidatedCount} sessions)`);
    }

    return {
      success: true,
      userId,
      invalidatedCount,
      timestamp: new Date().toISOString(),
    };
  }

  getActiveSessions(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const activeSessions = [];
    const now = Date.now();

    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        const expiresAt = new Date(session.expiresAt).getTime();
        if (now <= expiresAt) {
          activeSessions.push({
            sessionToken: token,
            role: session.role,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            lastActivity: new Date(session.lastActivity).toISOString(),
          });
        }
      }
    }

    return {
      userId,
      activeSessions,
      count: activeSessions.length,
      timestamp: new Date().toISOString(),
    };
  }

  validateSessionRole(sessionToken, requiredRole) {
    if (!sessionToken || !requiredRole) {
      return {
        valid: false,
        error: 'Session token and required role are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const validation = this.validateSession(sessionToken);
    if (!validation.valid) {
      return validation;
    }

    const session = this.sessions.get(sessionToken);
    const hasRole = roleBasedAccessControlService.hasRole(session.userId, requiredRole);

    if (!hasRole) {
      logger.warn(`Session role validation failed: ${session.userId} requires ${requiredRole}`);
      return {
        valid: false,
        error: `Session does not have required role: ${requiredRole}`,
        code: 'INSUFFICIENT_ROLE',
        sessionToken,
        currentRole: session.role,
        requiredRole,
      };
    }

    return {
      valid: true,
      message: 'Session has required role',
      code: 'ROLE_VALID',
      sessionToken,
      userId: session.userId,
      role: session.role,
    };
  }

  trackLoginAttempt(email, success) {
    if (!email) {
      return null;
    }

    if (!this.loginHistory.has(email)) {
      this.loginHistory.set(email, []);
    }

    const attempt = {
      email,
      success,
      timestamp: new Date().toISOString(),
    };

    const history = this.loginHistory.get(email);
    history.push(attempt);

    // Keep only last 100 attempts per email
    if (history.length > 100) {
      this.loginHistory.set(email, history.slice(-100));
    }

    return attempt;
  }

  getLoginHistory(userId, limit = 50) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 50;
    }

    // In a real implementation, this would fetch from database
    // For now, return empty history
    return {
      userId,
      attempts: [],
      count: 0,
      limit,
      timestamp: new Date().toISOString(),
    };
  }

  generateSessionToken() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const counter = ++this.sessionIdCounter;
    return `session-${timestamp}-${counter}-${random}`;
  }

  validateCredentials(email, password) {
    // Simulate credential validation
    // In real implementation, this would validate against PocketBase
    if (!email || !password) {
      return false;
    }

    // For testing: accept any non-empty email/password
    // In production, validate against actual user database
    return email.includes('@') && password.length >= 6;
  }

  extractUserIdFromEmail(email) {
    // Extract user ID from email
    // In real implementation, fetch from PocketBase
    const localPart = email.split('@')[0];
    return localPart.replace(/[^a-zA-Z0-9-_]/g, '-');
  }

  recordFailedLoginAttempt(email) {
    if (!email) {
      return null;
    }

    if (!this.accountLockouts.has(email)) {
      this.accountLockouts.set(email, {
        attempts: 0,
        expiresAt: 0,
      });
    }

    const lockout = this.accountLockouts.get(email);
    lockout.attempts += 1;

    if (lockout.attempts >= this.maxLoginAttempts) {
      lockout.expiresAt = Date.now() + this.lockoutDurationMs;
      logger.warn(`Account locked due to failed login attempts: ${email}`);
    }

    return lockout;
  }

  getSessionStats() {
    const now = Date.now();
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const session of this.sessions.values()) {
      const expiresAt = new Date(session.expiresAt).getTime();
      if (now <= expiresAt) {
        activeSessions += 1;
      } else {
        expiredSessions += 1;
      }
    }

    return {
      activeSessions,
      expiredSessions,
      totalSessions: this.sessions.size,
      timestamp: new Date().toISOString(),
    };
  }
}

const enhancedAuthService = new EnhancedAuthService();

export default enhancedAuthService;
export { EnhancedAuthService };