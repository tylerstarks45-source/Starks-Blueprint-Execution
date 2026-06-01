import logger from '../utils/logger.js';

class AIRequestManager {
  constructor() {
    this.requests = new Map();
    this.requestIdCounter = 0;
    this.requestMetadata = new Map();
    this.maxStoredRequests = 10000;
  }

  createRequest(taskType, payload = {}) {
    if (!taskType) {
      throw new Error('Task type is required');
    }

    const requestId = `req-${Date.now()}-${++this.requestIdCounter}`;

    const request = {
      id: requestId,
      taskType,
      payload,
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        attempts: 0,
        maxAttempts: 3,
      },
    };

    this.requests.set(requestId, request);
    logger.info(`Request created: ${requestId} (type: ${taskType})`);

    return request;
  }

  getRequest(requestId) {
    if (!requestId) {
      throw new Error('Request ID is required');
    }

    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    return request;
  }

  listRequests(filters = {}) {
    let requests = Array.from(this.requests.values());

    if (filters.taskType) {
      requests = requests.filter(r => r.taskType === filters.taskType);
    }

    if (filters.status) {
      requests = requests.filter(r => r.status === filters.status);
    }

    if (filters.limit) {
      requests = requests.slice(-filters.limit);
    }

    return requests;
  }

  updateRequestStatus(requestId, status) {
    const request = this.getRequest(requestId);

    const validStatuses = ['created', 'queued', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    request.status = status;
    request.updatedAt = new Date().toISOString();

    logger.info(`Request status updated: ${requestId} -> ${status}`);

    return request;
  }

  prepareRequestRouting(request) {
    if (!request || !request.id) {
      throw new Error('Valid request object is required');
    }

    const routing = {
      requestId: request.id,
      taskType: request.taskType,
      routingId: `routing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      strategy: this.determineRoutingStrategy(request.taskType),
      priority: 'normal',
      targetService: this.getTargetService(request.taskType),
      fallbackServices: this.getFallbackServices(request.taskType),
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
      },
      queueing: {
        enabled: true,
        position: this.requests.size,
      },
      metadata: {
        createdAt: new Date().toISOString(),
      },
    };

    logger.info(`Request routing prepared: ${routing.routingId}`);
    return routing;
  }

  trackRequestMetadata(requestId, metadata = {}) {
    const request = this.getRequest(requestId);

    const tracked = {
      requestId,
      metadata: {
        ...metadata,
        trackedAt: new Date().toISOString(),
      },
    };

    this.requestMetadata.set(requestId, tracked);

    // Cleanup old metadata if storage exceeds limit
    if (this.requestMetadata.size > this.maxStoredRequests) {
      const oldestKey = this.requestMetadata.keys().next().value;
      this.requestMetadata.delete(oldestKey);
    }

    logger.info(`Request metadata tracked: ${requestId}`);
    return tracked;
  }

  getRequestMetadata(requestId) {
    const metadata = this.requestMetadata.get(requestId);
    if (!metadata) {
      return null;
    }
    return metadata;
  }

  determineRoutingStrategy(taskType) {
    const strategies = {
      blueprint_analysis: 'direct',
      prompt_generation: 'direct',
      model_selection: 'decision-tree',
      plan_creation: 'direct',
      response_validation: 'direct',
    };
    return strategies[taskType] || 'direct';
  }

  getTargetService(taskType) {
    const services = {
      blueprint_analysis: 'blueprint-analyzer',
      prompt_generation: 'prompt-builder',
      model_selection: 'model-router',
      plan_creation: 'system-planner',
      response_validation: 'response-validator',
    };
    return services[taskType] || 'default-service';
  }

  getFallbackServices(taskType) {
    return ['default-service', 'fallback-service'];
  }

  getRequestStats() {
    const stats = {
      totalRequests: this.requests.size,
      totalMetadataTracked: this.requestMetadata.size,
      byStatus: {},
      byTaskType: {},
    };

    this.requests.forEach(request => {
      stats.byStatus[request.status] = (stats.byStatus[request.status] || 0) + 1;
      stats.byTaskType[request.taskType] = (stats.byTaskType[request.taskType] || 0) + 1;
    });

    return stats;
  }

  clearOldRequests(olderThanMs = 3600000) {
    const cutoffTime = Date.now() - olderThanMs;
    let clearedCount = 0;

    for (const [requestId, request] of this.requests.entries()) {
      const createdTime = new Date(request.createdAt).getTime();
      if (createdTime < cutoffTime) {
        this.requests.delete(requestId);
        this.requestMetadata.delete(requestId);
        clearedCount += 1;
      }
    }

    logger.info(`Cleared ${clearedCount} old requests`);
    return { clearedCount };
  }
}

export default AIRequestManager;
export { AIRequestManager };