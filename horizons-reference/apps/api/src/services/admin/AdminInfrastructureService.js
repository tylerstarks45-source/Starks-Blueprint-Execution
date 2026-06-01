import 'dotenv/config';
import OpenRouterService from '../ai/OpenRouterService.js';
import centralizedAIService from '../ai/CentralizedAIService.js';
import logger from '../../utils/logger.js';

class AdminInfrastructureService {
  constructor() {
    this.openRouterService = null;
    this.initialized = false;
    this.initializeService();
  }

  initializeService() {
    try {
      this.openRouterService = new OpenRouterService();
      this.initialized = true;
      logger.info('Admin Infrastructure Service initialized');
    } catch (error) {
      logger.warn('Admin Infrastructure Service initialization warning:', error.message);
    }
  }

  getOpenRouterHealth() {
    if (!this.initialized || !this.openRouterService) {
      return {
        status: 'unavailable',
        message: 'Starks AI Engine not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const stats = this.openRouterService.getUsageStats();

    return {
      status: 'operational',
      infrastructure: 'Starks AI Engine',
      health: {
        connected: true,
        baseUrl: this.openRouterService.baseUrl,
        timeout: this.openRouterService.timeout,
        retryCount: this.openRouterService.retryCount,
      },
      stats: {
        totalRequests: stats.totalRequests,
        totalTokens: stats.totalTokens,
        totalErrors: stats.totalErrors,
        averageResponseTime: stats.averageResponseTime,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getPlatformAIUsage() {
    if (!centralizedAIService.initialized) {
      return {
        status: 'unavailable',
        message: 'Centralized AI infrastructure not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const usage = centralizedAIService.getPlatformUsage();

    return {
      status: 'available',
      usage: {
        totalTokens: usage.totalTokens,
        totalRequests: usage.totalRequests,
        activeUsers: usage.userCount,
        byModel: usage.byModel,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getActiveAISessions() {
    if (!centralizedAIService.initialized) {
      return {
        status: 'unavailable',
        sessions: [],
        message: 'Centralized AI infrastructure not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const queueStatus = centralizedAIService.getRequestQueueStatus();

    return {
      status: 'available',
      activeSessions: queueStatus.queueLength,
      maxCapacity: queueStatus.maxQueueSize,
      utilizationPercent: queueStatus.utilizationPercent,
      sessions: queueStatus.requests.map(req => ({
        sessionId: req.id,
        taskType: req.taskType,
        status: req.status,
        createdAt: req.createdAt,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  getTokenConsumption() {
    if (!centralizedAIService.initialized) {
      return {
        status: 'unavailable',
        message: 'Centralized AI infrastructure not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const usage = centralizedAIService.getPlatformUsage();
    const openRouterStats = this.openRouterService?.getUsageStats() || {};

    return {
      status: 'available',
      consumption: {
        totalTokens: usage.totalTokens,
        promptTokens: openRouterStats.totalPromptTokens || 0,
        completionTokens: openRouterStats.totalCompletionTokens || 0,
        byModel: usage.byModel,
      },
      metrics: {
        averageTokensPerRequest: usage.totalRequests > 0
          ? Math.round(usage.totalTokens / usage.totalRequests)
          : 0,
        totalRequests: usage.totalRequests,
        activeUsers: usage.userCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getRequestAnalytics() {
    if (!centralizedAIService.initialized) {
      return {
        status: 'unavailable',
        message: 'Centralized AI infrastructure not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const usage = centralizedAIService.getPlatformUsage();
    const openRouterStats = this.openRouterService?.getUsageStats() || {};

    return {
      status: 'available',
      analytics: {
        totalRequests: usage.totalRequests,
        totalTokens: usage.totalTokens,
        activeUsers: usage.userCount,
        modelBreakdown: usage.byModel,
        errorRate: openRouterStats.totalErrors > 0
          ? Math.round((openRouterStats.totalErrors / usage.totalRequests) * 100)
          : 0,
        averageResponseTime: openRouterStats.averageResponseTime || 0,
      },
      topModels: this.getTopModels(usage.byModel),
      timestamp: new Date().toISOString(),
    };
  }

  getErrorMonitoring() {
    if (!this.initialized || !this.openRouterService) {
      return {
        status: 'unavailable',
        errors: [],
        message: 'Starks AI Engine not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const errorHistory = this.openRouterService.getErrorHistory(100);
    const errorCategories = {};

    errorHistory.forEach(error => {
      const category = error.category || 'UNKNOWN';
      errorCategories[category] = (errorCategories[category] || 0) + 1;
    });

    return {
      status: 'available',
      monitoring: {
        totalErrors: errorHistory.length,
        errorCategories,
        recentErrors: errorHistory.slice(-20).map(error => ({
          timestamp: error.timestamp,
          category: error.category,
          message: error.message,
          model: error.model,
        })),
      },
      recoveryStatus: {
        operational: true,
        lastError: errorHistory.length > 0 ? errorHistory[errorHistory.length - 1].timestamp : null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getSystemHealth() {
    const openRouterHealth = this.getOpenRouterHealth();
    const platformUsage = this.getPlatformAIUsage();
    const activeSessions = this.getActiveAISessions();
    const errorMonitoring = this.getErrorMonitoring();

    const overallStatus = this.determineOverallStatus(
      openRouterHealth,
      platformUsage,
      activeSessions,
      errorMonitoring
    );

    return {
      status: overallStatus,
      infrastructure: {
        starksAIEngine: openRouterHealth.status,
        centralizedAI: platformUsage.status,
        activeSessions: activeSessions.status,
        errorMonitoring: errorMonitoring.status,
      },
      components: {
        openRouterHealth,
        platformUsage,
        activeSessions,
        errorMonitoring,
      },
      timestamp: new Date().toISOString(),
    };
  }

  determineOverallStatus(openRouterHealth, platformUsage, activeSessions, errorMonitoring) {
    const statuses = [
      openRouterHealth.status,
      platformUsage.status,
      activeSessions.status,
      errorMonitoring.status,
    ];

    if (statuses.includes('unavailable')) {
      return 'degraded';
    }

    if (statuses.every(s => s === 'available' || s === 'operational')) {
      return 'healthy';
    }

    return 'unknown';
  }

  getTopModels(byModel, limit = 5) {
    if (!byModel || Object.keys(byModel).length === 0) {
      return [];
    }

    return Object.entries(byModel)
      .map(([model, stats]) => ({
        model,
        tokens: stats.tokens,
        requests: stats.requests,
        averageTokensPerRequest: Math.round(stats.tokens / stats.requests),
      }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, limit);
  }

  testCentralizedInfrastructure() {
    if (!this.initialized || !this.openRouterService) {
      return {
        success: false,
        message: 'Starks AI Engine not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      infrastructure: 'Starks AI Engine',
      status: 'operational',
      components: {
        openRouterService: 'initialized',
        centralizedAI: centralizedAIService.initialized ? 'initialized' : 'not_initialized',
      },
      availableModels: centralizedAIService.getAvailableModels(),
      timestamp: new Date().toISOString(),
    };
  }
}

const adminInfrastructureService = new AdminInfrastructureService();

export default adminInfrastructureService;
export { AdminInfrastructureService };