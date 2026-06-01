import 'dotenv/config';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

class EnhancedSessionManagementService {
  constructor() {
    this.sessions = new Map();
    this.sessionHashes = new Map();
    this.invalidatedSessions = new Set();
    this.sessionIdCounter = 0;
    this.sessionExpirationMs = 24 * 60 * 60 * 1000; // 24 hours
    this.hmacSecret = process.env.SESSION_HMAC_SECRET || 'default-session-secret-change-in-production';
    this.maxStoredSessions = 10000;
    this.initialized = true;
    logger.info('Enhanced Session Management Service initialized');
  }

  createSecureSession(userId, role, metadata = {}) {
    if (!userId || !role) {
      throw new Error('User ID and role are required');
    }

    if (typeof userId !== 'string' || typeof role !== 'string') {
      throw new Error('User ID and role must be strings');
    }

    const sessionToken = this.generateSessionToken();
    const now = Date.now();
    const expiresAt = now + this.sessionExpirationMs;

    const session = {
      sessionToken,
      userId,
      role,
      createdAt: new Date(now).toISOString(),
      lastActivity: now,
      expiresAt: new Date(expiresAt).toISOString(),
      metadata: {
        ...metadata,
        createdAt: new Date(now).toISOString(),
      },
      active: true,
    };

    // Generate HMAC integrity hash
    const integrityHash = this.generateIntegrityHash(session);
    this.sessionHashes.set(sessionToken, integrityHash);

    // Store session
    this.sessions.set(sessionToken, session);

    // Cleanup if storage exceeds limit
    if (this.sessions.size > this.maxStoredSessions) {
      this.cleanupExpiredSessions();
    }

    this.logSessionEvent(sessionToken, 'SESSION_CREATED', { userId, role });

    logger.info(`Secure session created: ${sessionToken} (user: ${userId}, role: ${role})`);

    return {
      sessionToken,
      userId,
      role,
      expiresAt: session.expiresAt,
      expiresIn: this.sessionExpirationMs,
      timestamp: new Date().toISOString(),
    };
  }

  validateSessionIntegrity(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      logger.warn(`Session integrity validation failed: session not found (${sessionToken})`);
      throw new Error('Session not found');
    }

    const storedHash = this.sessionHashes.get(sessionToken);
    const currentHash = this.generateIntegrityHash(session);

    if (storedHash !== currentHash) {
      logger.error(`Session integrity violation: ${sessionToken} has been tampered`);
      this.invalidatedSessions.add(sessionToken);
      throw new Error('Session integrity violation: Session has been tampered');
    }

    logger.debug(`Session integrity validated: ${sessionToken}`);
    return {
      valid: true,
      message: 'Session integrity verified',
      code: 'INTEGRITY_VALID',
      sessionToken,
    };
  }

  validateSessionExpiration(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      logger.warn(`Session expiration validation failed: session not found (${sessionToken})`);
      throw new Error('Session not found');
    }

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();

    if (now > expiresAt) {
      logger.warn(`Session expiration validation failed: ${sessionToken} is expired`);
      this.sessions.delete(sessionToken);
      this.sessionHashes.delete(sessionToken);
      throw new Error('Session has expired');
    }

    logger.debug(`Session expiration validated: ${sessionToken}`);
    return {
      valid: true,
      message: 'Session is not expired',
      code: 'EXPIRATION_VALID',
      sessionToken,
      expiresAt: session.expiresAt,
    };
  }

  validateSessionActive(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    if (this.invalidatedSessions.has(sessionToken)) {
      logger.warn(`Session active validation failed: ${sessionToken} has been invalidated`);
      throw new Error('Session has been invalidated');
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      logger.warn(`Session active validation failed: ${sessionToken} not found`);
      throw new Error('Session not found');
    }

    if (!session.active) {
      logger.warn(`Session active validation failed: ${sessionToken} is not active`);
      throw new Error('Session is not active');
    }

    logger.debug(`Session active validation passed: ${sessionToken}`);
    return {
      valid: true,
      message: 'Session is active',
      code: 'SESSION_ACTIVE',
      sessionToken,
    };
  }

  getSessionMetadata(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      throw new Error('Session not found');
    }

    return {
      sessionToken,
      userId: session.userId,
      role: session.role,
      createdAt: session.createdAt,
      lastActivity: new Date(session.lastActivity).toISOString(),
      expiresAt: session.expiresAt,
      active: session.active,
      metadata: session.metadata,
      timestamp: new Date().toISOString(),
    };
  }

  updateSessionActivity(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivity = Date.now();

    // Regenerate integrity hash after activity update
    const integrityHash = this.generateIntegrityHash(session);
    this.sessionHashes.set(sessionToken, integrityHash);

    logger.debug(`Session activity updated: ${sessionToken}`);
    return {
      sessionToken,
      lastActivity: new Date(session.lastActivity).toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  invalidateSession(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      throw new Error('Session not found');
    }

    session.active = false;
    this.invalidatedSessions.add(sessionToken);

    this.logSessionEvent(sessionToken, 'SESSION_INVALIDATED', { userId: session.userId });

    logger.info(`Session invalidated: ${sessionToken} (user: ${session.userId})`);

    return {
      success: true,
      sessionToken,
      userId: session.userId,
      timestamp: new Date().toISOString(),
    };
  }

  invalidateAllUserSessions(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    let invalidatedCount = 0;
    const sessionsToInvalidate = [];

    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        sessionsToInvalidate.push(token);
        invalidatedCount += 1;
      }
    }

    sessionsToInvalidate.forEach(token => {
      const session = this.sessions.get(token);
      session.active = false;
      this.invalidatedSessions.add(token);
      this.logSessionEvent(token, 'SESSION_INVALIDATED', { userId });
    });

    logger.info(`All sessions invalidated for user: ${userId} (${invalidatedCount} sessions)`);

    return {
      success: true,
      userId,
      invalidatedCount,
      timestamp: new Date().toISOString(),
    };
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    let clearedCount = 0;
    const sessionsToDelete = [];

    for (const [token, session] of this.sessions.entries()) {
      const expiresAt = new Date(session.expiresAt).getTime();
      if (now > expiresAt) {
        sessionsToDelete.push(token);
        clearedCount += 1;
      }
    }

    sessionsToDelete.forEach(token => {
      this.sessions.delete(token);
      this.sessionHashes.delete(token);
    });

    logger.info(`Expired sessions cleaned up: ${clearedCount} sessions removed`);

    return {
      success: true,
      clearedCount,
      timestamp: new Date().toISOString(),
    };
  }

  validateSessionOwnership(sessionToken, userId) {
    if (!sessionToken || !userId) {
      throw new Error('Session token and user ID are required');
    }

    if (typeof sessionToken !== 'string' || typeof userId !== 'string') {
      throw new Error('Session token and user ID must be strings');
    }

    const session = this.sessions.get(sessionToken);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.userId !== userId) {
      logger.error(`Session ownership violation: ${userId} attempted to access ${session.userId} session`);
      throw new Error('Session ownership violation: Session does not belong to user');
    }

    logger.debug(`Session ownership validated: ${userId} owns ${sessionToken}`);
    return {
      valid: true,
      message: 'User owns this session',
      code: 'OWNERSHIP_VALID',
      sessionToken,
      userId,
    };
  }

  preventSessionReuse(sessionToken) {
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new Error('Session token is required and must be a string');
    }

    if (this.invalidatedSessions.has(sessionToken)) {
      logger.error(`Session reuse attempt: ${sessionToken} has been invalidated`);
      throw new Error('Session reuse prevented: Session has been invalidated');
    }

    logger.debug(`Session reuse prevention passed: ${sessionToken}`);
    return {
      valid: true,
      message: 'Session reuse prevented',
      code: 'REUSE_PREVENTED',
      sessionToken,
    };
  }

  logSessionEvent(sessionToken, event, details = {}) {
    if (!sessionToken || !event) {
      logger.warn('Invalid session event log parameters');
      return null;
    }

    const logEntry = {
      sessionToken,
      event,
      details,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Session event: ${event} (${sessionToken})`);
    return logEntry;
  }

  generateSessionToken() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const counter = ++this.sessionIdCounter;
    return `session-${timestamp}-${counter}-${random}`;
  }

  generateIntegrityHash(session) {
    const data = JSON.stringify({
      sessionToken: session.sessionToken,
      userId: session.userId,
      role: session.role,
      createdAt: session.createdAt,
    });

    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(data)
      .digest('hex');
  }

  getSessionStats() {
    const now = Date.now();
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const session of this.sessions.values()) {
      const expiresAt = new Date(session.expiresAt).getTime();
      if (now <= expiresAt && session.active) {
        activeSessions += 1;
      } else {
        expiredSessions += 1;
      }
    }

    return {
      activeSessions,
      expiredSessions,
      totalSessions: this.sessions.size,
      invalidatedSessions: this.invalidatedSessions.size,
      timestamp: new Date().toISOString(),
    };
  }
}

const enhancedSessionManagementService = new EnhancedSessionManagementService();

export default enhancedSessionManagementService;
export { EnhancedSessionManagementService };