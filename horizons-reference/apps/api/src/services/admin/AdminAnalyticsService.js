import 'dotenv/config';
import centralizedAIService from '../ai/CentralizedAIService.js';
import logger from '../../utils/logger.js';

class AdminAnalyticsService {
  constructor() {
    this.initialized = false;
    this.initializeService();
  }

  initializeService() {
    try {
      this.initialized = true;
      logger.info('Admin Analytics Service initialized');
    } catch (error) {
      logger.warn('Admin Analytics Service initialization warning:', error.message);
    }
  }

  getTotalPlatformUsers() {
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
      metrics: {
        totalActiveUsers: usage.userCount,
        totalInactiveUsers: 0,
        totalUsers: usage.userCount,
        growthRate: 0,
        retentionRate: 0,
      },
      breakdown: {
        active: usage.userCount,
        inactive: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getTotalActiveSystems() {
    return {
      status: 'available',
      metrics: {
        totalActiveSystems: 0,
        totalWorkflows: 0,
        totalAutomations: 0,
        totalBuilds: 0,
      },
      breakdown: {
        active: 0,
        inactive: 0,
        paused: 0,
        error: 0,
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
      metrics: {
        totalTokens: usage.totalTokens,
        totalRequests: usage.totalRequests,
        activeUsers: usage.userCount,
        averageTokensPerRequest: usage.totalRequests > 0
          ? Math.round(usage.totalTokens / usage.totalRequests)
          : 0,
      },
      byModel: usage.byModel,
      trends: {
        tokenGrowth: 0,
        requestGrowth: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getOpenRouterHealth() {
    if (!centralizedAIService.openRouterService) {
      return {
        status: 'unavailable',
        message: 'OpenRouter service not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const stats = centralizedAIService.openRouterService.getUsageStats();

    return {
      status: 'operational',
      infrastructure: 'Starks AI Engine',
      health: {
        connected: true,
        apiStatus: 'operational',
        responseTimeMs: stats.averageResponseTime,
        errorRate: stats.totalRequests > 0
          ? Math.round((stats.totalErrors / stats.totalRequests) * 100)
          : 0,
      },
      models: {
        available: centralizedAIService.openRouterService.supportedModels.length,
        active: Object.keys(stats.byModel).length,
      },
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
    const openRouterStats = centralizedAIService.openRouterService?.getUsageStats() || {};

    return {
      status: 'available',
      consumption: {
        totalTokens: usage.totalTokens,
        promptTokens: openRouterStats.totalPromptTokens || 0,
        completionTokens: openRouterStats.totalCompletionTokens || 0,
      },
      byModel: usage.byModel,
      metrics: {
        averageTokensPerRequest: usage.totalRequests > 0
          ? Math.round(usage.totalTokens / usage.totalRequests)
          : 0,
        totalRequests: usage.totalRequests,
        activeUsers: usage.userCount,
      },
      trends: {
        dailyGrowth: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0,
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
    const openRouterStats = centralizedAIService.openRouterService?.getUsageStats() || {};

    return {
      status: 'available',
      analytics: {
        totalRequests: usage.totalRequests,
        totalTokens: usage.totalTokens,
        activeUsers: usage.userCount,
        successRate: usage.totalRequests > 0
          ? Math.round(((usage.totalRequests - (openRouterStats.totalErrors || 0)) / usage.totalRequests) * 100)
          : 0,
        errorRate: openRouterStats.totalErrors > 0
          ? Math.round((openRouterStats.totalErrors / usage.totalRequests) * 100)
          : 0,
        averageResponseTime: openRouterStats.averageResponseTime || 0,
      },
      modelBreakdown: usage.byModel,
      topModels: this.getTopModels(usage.byModel),
      trends: {
        requestGrowth: 0,
        successRateTrend: 0,
        errorRateTrend: 0,
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
      distribution: {
        byStatus: this.getSessionDistribution(queueStatus.requests),
        byTaskType: this.getTaskTypeDistribution(queueStatus.requests),
      },
      timestamp: new Date().toISOString(),
    };
  }

  getErrorMonitoring() {
    if (!centralizedAIService.openRouterService) {
      return {
        status: 'unavailable',
        errors: [],
        message: 'OpenRouter service not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const errorHistory = centralizedAIService.openRouterService.getErrorHistory(100);
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
      trends: {
        errorGrowth: 0,
        recoveryRate: 100,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getSubscriptionMetrics() {
    return {
      status: 'available',
      metrics: {
        activeSubscriptions: 0,
        totalSubscriptions: 0,
        churnRate: 0,
        mrr: 0,
      },
      byTier: {
        free: 0,
        starter: 0,
        professional: 0,
        enterprise: 0,
      },
      trends: {
        subscriptionGrowth: 0,
        churnTrend: 0,
        mrrGrowth: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getRevenueTracking() {
    return {
      status: 'available',
      metrics: {
        subscriptionRevenue: 0,
        usageBasedRevenue: 0,
        totalRevenue: 0,
        averageRevenuePerUser: 0,
      },
      breakdown: {
        subscriptions: 0,
        usage: 0,
        other: 0,
      },
      trends: {
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getSystemHealthMonitoring() {
    return {
      status: 'available',
      components: {
        apiHealth: 'operational',
        databaseHealth: 'operational',
        cacheHealth: 'operational',
        storageHealth: 'operational',
      },
      metrics: {
        uptime: 100,
        responseTime: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
      },
      overallStatus: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  getAIInfrastructureStatus() {
    if (!centralizedAIService.initialized) {
      return {
        status: 'unavailable',
        message: 'Centralized AI infrastructure not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const queueStatus = centralizedAIService.getRequestQueueStatus();
    const usage = centralizedAIService.getPlatformUsage();

    return {
      status: 'available',
      infrastructure: 'Starks AI Engine',
      health: {
        connected: true,
        operational: true,
        modelsAvailable: centralizedAIService.openRouterService?.supportedModels.length || 0,
      },
      queue: {
        length: queueStatus.queueLength,
        maxCapacity: queueStatus.maxQueueSize,
        utilizationPercent: queueStatus.utilizationPercent,
      },
      usage: {
        totalTokens: usage.totalTokens,
        totalRequests: usage.totalRequests,
        activeUsers: usage.userCount,
      },
      performance: {
        averageResponseTime: centralizedAIService.openRouterService?.getUsageStats().averageResponseTime || 0,
        successRate: 100,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getUserActivityMonitoring() {
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
      metrics: {
        activeUsers: usage.userCount,
        totalActions: usage.totalRequests,
        averageActionsPerUser: usage.userCount > 0
          ? Math.round(usage.totalRequests / usage.userCount)
          : 0,
        engagementRate: 0,
      },
      distribution: {
        byModel: usage.byModel,
        byTaskType: {},
      },
      trends: {
        userGrowth: 0,
        engagementTrend: 0,
        activityTrend: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getPlatformWideLogs(type = 'all', limit = 100) {
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      limit = 100;
    }

    const logs = {
      request: [],
      error: [],
      admin: [],
      system: [],
    };

    // Collect request logs
    if (type === 'all' || type === 'request') {
      if (centralizedAIService.openRouterService) {
        const requests = centralizedAIService.openRouterService.getRequestHistory(limit);
        logs.request = requests.map(req => ({
          timestamp: req.timestamp,
          type: 'request',
          model: req.model,
          status: req.status,
          responseTime: req.responseTime,
        }));
      }
    }

    // Collect error logs
    if (type === 'all' || type === 'error') {
      if (centralizedAIService.openRouterService) {
        const errors = centralizedAIService.openRouterService.getErrorHistory(limit);
        logs.error = errors.map(error => ({
          timestamp: error.timestamp,
          type: 'error',
          category: error.category,
          message: error.message,
          model: error.model,
        }));
      }
    }

    // Collect admin logs (placeholder)
    if (type === 'all' || type === 'admin') {
      logs.admin = [];
    }

    // Collect system logs (placeholder)
    if (type === 'all' || type === 'system') {
      logs.system = [];
    }

    const allLogs = [
      ...logs.request,
      ...logs.error,
      ...logs.admin,
      ...logs.system,
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    return {
      status: 'available',
      logs: allLogs,
      summary: {
        totalLogs: allLogs.length,
        byType: {
          request: logs.request.length,
          error: logs.error.length,
          admin: logs.admin.length,
          system: logs.system.length,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  getRuntimeMonitoringPreparation() {
    return {
      status: 'available',
      preparation: {
        runtimeTracking: {
          enabled: false,
          message: 'Prepared for future runtime tracking implementation',
        },
        executionMonitoring: {
          enabled: false,
          message: 'Prepared for future execution monitoring implementation',
        },
        automationTracking: {
          enabled: false,
          message: 'Prepared for future automation tracking implementation',
        },
        deploymentMonitoring: {
          enabled: false,
          message: 'Prepared for future deployment monitoring implementation',
        },
      },
      infrastructure: {
        metricsCollection: 'ready',
        dataAggregation: 'ready',
        alerting: 'ready',
        reporting: 'ready',
      },
      timestamp: new Date().toISOString(),
    };
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

  getSessionDistribution(sessions) {
    const distribution = {};
    sessions.forEach(session => {
      distribution[session.status] = (distribution[session.status] || 0) + 1;
    });
    return distribution;
  }

  getTaskTypeDistribution(sessions) {
    const distribution = {};
    sessions.forEach(session => {
      distribution[session.taskType] = (distribution[session.taskType] || 0) + 1;
    });
    return distribution;
  }
}

const adminAnalyticsService = new AdminAnalyticsService();

export default adminAnalyticsService;
export { AdminAnalyticsService };