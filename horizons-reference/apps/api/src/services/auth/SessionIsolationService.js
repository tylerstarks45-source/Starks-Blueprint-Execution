import 'dotenv/config';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

class SessionIsolationService {
  constructor() {
    this.isolatedSessions = new Map();
    this.sessionMetadata = new Map();
    this.sessionIntegrityHashes = new Map();
    this.sessionExpirationMs = 24 * 60 * 60 * 1000; // 24 hours
    this.initialized = true;
    logger.info('Session Isolation Service initialized');
  }

  createIsolatedSession(userId, role, metadata = {}) {
    if (!userId || !role) {
      throw new Error('User ID and role are required');
    }

    const sessionToken = this.generateSessionToken();
    const now = Date.now();
    const expiresAt = now + this.sessionExpirationMs;

    const session = {
      sessionToken,
      userId,
      role,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      isolated: true,
      metadata: {
        ...metadata,
        createdAt: new Date(now).toISOString(),
      },
    };

    // Generate integrity hash
    const integrityHash = this.generateIntegrityHash(session);
    this.sessionIntegrityHashes.set(sessionToken, integrityHash);

    // Store session
    this.isolatedSessions.set(sessionToken, session);
    this.sessionMetadata.set(sessionToken, session.metadata);

    logger.info(`Isolated session created: ${sessionToken} (user: ${userId}, role: ${role})`);

    return {
      sessionToken,
      userId,
      role,
      expiresAt: session.expiresAt,
      isolated: true,
      timestamp: new Date().toISOString(),
    };
  }

  validateSessionOwnership(sessionToken, userId) {
    if (!sessionToken || !userId) {
      return {
        valid: false,
        error: 'Session token and user ID are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const session = this.isolatedSessions.get(sessionToken);

    if (!session) {
      logger.warn(`Session ownership validation failed: session not found (${sessionToken})`);
      return {
        valid: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      };
    }

    if (session.userId !== userId) {
      logger.warn(`Session ownership violation: ${userId} attempted to access ${session.userId} session`);
      return {
        valid: false,
        error: 'User does not own this session',
        code: 'OWNERSHIP_VIOLATION',
        sessionToken,
        attemptedUserId: userId,
        sessionUserId: session.userId,
      };
    }

    return {
      valid: true,
      message: 'User owns this session',
      code: 'OWNERSHIP_VALID',
      sessionToken,
      userId,
    };
  }

  enforceSessionBoundary(sessionToken, userId) {
    if (!sessionToken || !userId) {
      return {
        enforced: false,
        error: 'Session token and user ID are required',
      };
    }

    const session = this.isolatedSessions.get(sessionToken);

    if (!session) {
      logger.warn(`Session boundary enforcement failed: session not found`);
      return {
        enforced: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      };
    }

    // Verify session belongs to user
    if (session.userId !== userId) {
      logger.warn(`Session boundary violation: ${userId} attempted to access ${session.userId} session`);
      return {
        enforced: false,
        error: 'Session boundary violation: Cannot access other users sessions',
        code: 'BOUNDARY_VIOLATION',
      };
    }

    // Verify session is not expired
    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();

    if (now > expiresAt) {
      logger.warn(`Session boundary enforcement failed: session expired`);
      return {
        enforced: false,
        error: 'Session has expired',
        code: 'SESSION_EXPIRED',
      };
    }

    // Verify session integrity
    const integrityValid = this.validateSessionIntegrity(sessionToken);
    if (!integrityValid.valid) {
      logger.warn(`Session boundary enforcement failed: integrity check failed`);
      return {
        enforced: false,
        error: 'Session integrity check failed',
        code: 'INTEGRITY_VIOLATION',
      };
    }

    return {
      enforced: true,
      message: 'Session boundary enforced',
      code: 'BOUNDARY_ENFORCED',
      sessionToken,
      userId,
    };
  }

  getSessionMetadata(sessionToken) {
    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    const metadata = this.sessionMetadata.get(sessionToken);

    if (!metadata) {
      throw new Error('Session metadata not found');
    }

    return {
      sessionToken,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  updateSessionMetadata(sessionToken, metadata) {
    if (!sessionToken || !metadata || typeof metadata !== 'object') {
      throw new Error('Session token and metadata object are required');
    }

    const session = this.isolatedSessions.get(sessionToken);

    if (!session) {
      throw new Error('Session not found');
    }

    const currentMetadata = this.sessionMetadata.get(sessionToken) || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    this.sessionMetadata.set(sessionToken, updatedMetadata);
    session.metadata = updatedMetadata;

    // Regenerate integrity hash
    const integrityHash = this.generateIntegrityHash(session);
    this.sessionIntegrityHashes.set(sessionToken, integrityHash);

    logger.info(`Session metadata updated: ${sessionToken}`);

    return {
      sessionToken,
      metadata: updatedMetadata,
      timestamp: new Date().toISOString(),
    };
  }

  expireSession(sessionToken) {
    if (!sessionToken) {
      return {
        success: false,
        error: 'Session token is required',
      };
    }

    const session = this.isolatedSessions.get(sessionToken);

    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    this.isolatedSessions.delete(sessionToken);
    this.sessionMetadata.delete(sessionToken);
    this.sessionIntegrityHashes.delete(sessionToken);

    logger.info(`Session expired: ${sessionToken} (user: ${session.userId})`);

    return {
      success: true,
      sessionToken,
      userId: session.userId,
      timestamp: new Date().toISOString(),
    };
  }

  expireUserSessions(userId) {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    let expiredCount = 0;
    const sessionsToDelete = [];

    for (const [token, session] of this.isolatedSessions.entries()) {
      if (session.userId === userId) {
        sessionsToDelete.push(token);
        expiredCount += 1;
      }
    }

    sessionsToDelete.forEach(token => {
      this.isolatedSessions.delete(token);
      this.sessionMetadata.delete(token);
      this.sessionIntegrityHashes.delete(token);
    });

    if (expiredCount > 0) {
      logger.info(`All sessions expired for user: ${userId} (${expiredCount} sessions)`);
    }

    return {
      success: true,
      userId,
      expiredCount,
      timestamp: new Date().toISOString(),
    };
  }

  validateSessionIntegrity(sessionToken) {
    if (!sessionToken) {
      return {
        valid: false,
        error: 'Session token is required',
        code: 'MISSING_TOKEN',
      };
    }

    const session = this.isolatedSessions.get(sessionToken);

    if (!session) {
      return {
        valid: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      };
    }

    const storedHash = this.sessionIntegrityHashes.get(sessionToken);
    const currentHash = this.generateIntegrityHash(session);

    if (storedHash !== currentHash) {
      logger.warn(`Session integrity check failed: ${sessionToken}`);
      return {
        valid: false,
        error: 'Session integrity check failed',
        code: 'INTEGRITY_VIOLATION',
      };
    }

    return {
      valid: true,
      message: 'Session integrity verified',
      code: 'INTEGRITY_VALID',
      sessionToken,
    };
  }

  getSessionUser(sessionToken) {
    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    const session = this.isolatedSessions.get(sessionToken);

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      sessionToken,
      userId: session.userId,
      role: session.role,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      timestamp: new Date().toISOString(),
    };
  }

  getSessionRole(sessionToken) {
    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    const session = this.isolatedSessions.get(sessionToken);

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      sessionToken,
      userId: session.userId,
      role: session.role,
      timestamp: new Date().toISOString(),
    };
  }

  generateSessionToken() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `iso-${timestamp}-${random}`;
  }

  generateIntegrityHash(session) {
    const data = JSON.stringify({
      sessionToken: session.sessionToken,
      userId: session.userId,
      role: session.role,
      createdAt: session.createdAt,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  getSessionStats() {
    const now = Date.now();
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const session of this.isolatedSessions.values()) {
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
      totalSessions: this.isolatedSessions.size,
      timestamp: new Date().toISOString(),
    };
  }
}

const sessionIsolationService = new SessionIsolationService();

export default sessionIsolationService;
export { SessionIsolationService };