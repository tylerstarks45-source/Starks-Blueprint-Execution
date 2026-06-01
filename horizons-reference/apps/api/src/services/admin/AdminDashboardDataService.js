import 'dotenv/config';
import adminAnalyticsService from './AdminAnalyticsService.js';
import logger from '../../utils/logger.js';

class AdminDashboardDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTTL = {
      snapshot: 5 * 60 * 1000, // 5 minutes
      trends: 60 * 60 * 1000, // 1 hour
      overview: 5 * 60 * 1000, // 5 minutes
    };
    this.initialized = true;
    logger.info('Admin Dashboard Data Service initialized');
  }

  getDashboardOverview() {
    const cacheKey = 'dashboard-overview';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const overview = {
      status: 'success',
      data: {
        users: adminAnalyticsService.getTotalPlatformUsers(),
        systems: adminAnalyticsService.getTotalActiveSystems(),
        aiUsage: adminAnalyticsService.getPlatformAIUsage(),
        health: adminAnalyticsService.getSystemHealthMonitoring(),
        subscriptions: adminAnalyticsService.getSubscriptionMetrics(),
        revenue: adminAnalyticsService.getRevenueTracking(),
      },
      timestamp: new Date().toISOString(),
    };

    this.setCachedData(cacheKey, overview, this.cacheTTL.overview);
    return overview;
  }

  getMetricsSnapshot() {
    const cacheKey = 'metrics-snapshot';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const snapshot = {
      status: 'success',
      data: {
        platformUsers: adminAnalyticsService.getTotalPlatformUsers(),
        activeSystems: adminAnalyticsService.getTotalActiveSystems(),
        aiUsage: adminAnalyticsService.getPlatformAIUsage(),
        openRouterHealth: adminAnalyticsService.getOpenRouterHealth(),
        tokenConsumption: adminAnalyticsService.getTokenConsumption(),
        requestAnalytics: adminAnalyticsService.getRequestAnalytics(),
        activeSessions: adminAnalyticsService.getActiveAISessions(),
        errorMonitoring: adminAnalyticsService.getErrorMonitoring(),
        infrastructure: adminAnalyticsService.getAIInfrastructureStatus(),
        userActivity: adminAnalyticsService.getUserActivityMonitoring(),
      },
      timestamp: new Date().toISOString(),
    };

    this.setCachedData(cacheKey, snapshot, this.cacheTTL.snapshot);
    return snapshot;
  }

  getMetricsTrends(timeRange = 'day') {
    const validRanges = ['day', 'week', 'month', 'year'];
    if (!validRanges.includes(timeRange)) {
      timeRange = 'day';
    }

    const cacheKey = `metrics-trends-${timeRange}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const trends = {
      status: 'success',
      timeRange,
      data: {
        users: {
          metric: 'Total Platform Users',
          current: adminAnalyticsService.getTotalPlatformUsers().metrics.totalUsers,
          trend: 0,
          trendDirection: 'stable',
        },
        aiUsage: {
          metric: 'Platform AI Usage',
          current: adminAnalyticsService.getPlatformAIUsage().metrics.totalTokens,
          trend: 0,
          trendDirection: 'stable',
        },
        requests: {
          metric: 'Total Requests',
          current: adminAnalyticsService.getRequestAnalytics().analytics.totalRequests,
          trend: 0,
          trendDirection: 'stable',
        },
        errors: {
          metric: 'Total Errors',
          current: adminAnalyticsService.getErrorMonitoring().monitoring.totalErrors,
          trend: 0,
          trendDirection: 'stable',
        },
        subscriptions: {
          metric: 'Active Subscriptions',
          current: adminAnalyticsService.getSubscriptionMetrics().metrics.activeSubscriptions,
          trend: 0,
          trendDirection: 'stable',
        },
        revenue: {
          metric: 'Total Revenue',
          current: adminAnalyticsService.getRevenueTracking().metrics.totalRevenue,
          trend: 0,
          trendDirection: 'stable',
        },
      },
      timestamp: new Date().toISOString(),
    };

    this.setCachedData(cacheKey, trends, this.cacheTTL.trends);
    return trends;
  }

  getDetailedAnalytics(category = 'users') {
    const validCategories = ['users', 'systems', 'ai-usage', 'subscriptions', 'errors', 'infrastructure'];
    if (!validCategories.includes(category)) {
      category = 'users';
    }

    const cacheKey = `detailed-${category}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    let analytics = {};

    switch (category) {
      case 'users':
        analytics = {
          category: 'users',
          data: adminAnalyticsService.getTotalPlatformUsers(),
          activity: adminAnalyticsService.getUserActivityMonitoring(),
        };
        break;
      case 'systems':
        analytics = {
          category: 'systems',
          data: adminAnalyticsService.getTotalActiveSystems(),
        };
        break;
      case 'ai-usage':
        analytics = {
          category: 'ai-usage',
          usage: adminAnalyticsService.getPlatformAIUsage(),
          tokens: adminAnalyticsService.getTokenConsumption(),
          requests: adminAnalyticsService.getRequestAnalytics(),
        };
        break;
      case 'subscriptions':
        analytics = {
          category: 'subscriptions',
          metrics: adminAnalyticsService.getSubscriptionMetrics(),
          revenue: adminAnalyticsService.getRevenueTracking(),
        };
        break;
      case 'errors':
        analytics = {
          category: 'errors',
          data: adminAnalyticsService.getErrorMonitoring(),
        };
        break;
      case 'infrastructure':
        analytics = {
          category: 'infrastructure',
          aiStatus: adminAnalyticsService.getAIInfrastructureStatus(),
          health: adminAnalyticsService.getSystemHealthMonitoring(),
          openRouter: adminAnalyticsService.getOpenRouterHealth(),
        };
        break;
    }

    const detailed = {
      status: 'success',
      ...analytics,
      timestamp: new Date().toISOString(),
    };

    this.setCachedData(cacheKey, detailed, this.cacheTTL.snapshot);
    return detailed;
  }

  refreshDashboardData() {
    try {
      // Clear all cache entries
      this.cache.clear();
      this.cacheTimestamps.clear();

      // Refresh all major data points
      const refreshed = {
        status: 'success',
        message: 'Dashboard data refreshed successfully',
        refreshedAt: new Date().toISOString(),
        dataPoints: {
          overview: 'refreshed',
          snapshot: 'refreshed',
          trends: 'refreshed',
          analytics: 'refreshed',
        },
      };

      logger.info('Dashboard data refreshed');
      return refreshed;
    } catch (error) {
      logger.error('Dashboard data refresh error:', error.message);
      throw error;
    }
  }

  getCachedData(key) {
    if (!key || !this.cache.has(key)) {
      return null;
    }

    const timestamp = this.cacheTimestamps.get(key);
    const now = Date.now();

    // Determine TTL based on key pattern
    let ttl = this.cacheTTL.snapshot;
    if (key.includes('trends')) {
      ttl = this.cacheTTL.trends;
    } else if (key === 'dashboard-overview') {
      ttl = this.cacheTTL.overview;
    }

    // Check if cache has expired
    if (now - timestamp > ttl) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  setCachedData(key, data, ttl = this.cacheTTL.snapshot) {
    if (!key || !data) {
      return null;
    }

    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());

    logger.info(`Cache set for key: ${key} (TTL: ${ttl}ms)`);
    return data;
  }

  invalidateCache(key) {
    if (!key) {
      return { success: false, error: 'Cache key is required' };
    }

    if (key === '*') {
      // Clear all cache
      const clearedCount = this.cache.size;
      this.cache.clear();
      this.cacheTimestamps.clear();
      logger.info(`All cache cleared (${clearedCount} entries)`);
      return {
        success: true,
        message: 'All cache cleared',
        clearedCount,
      };
    }

    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      logger.info(`Cache invalidated for key: ${key}`);
      return {
        success: true,
        message: `Cache invalidated for key: ${key}`,
      };
    }

    return {
      success: false,
      message: `Cache key not found: ${key}`,
    };
  }

  getCacheStatus() {
    return {
      status: 'available',
      cacheSize: this.cache.size,
      cachedKeys: Array.from(this.cache.keys()),
      ttlConfig: this.cacheTTL,
      timestamp: new Date().toISOString(),
    };
  }
}

const adminDashboardDataService = new AdminDashboardDataService();

export default adminDashboardDataService;
export { AdminDashboardDataService };