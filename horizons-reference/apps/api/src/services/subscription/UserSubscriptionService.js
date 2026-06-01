import 'dotenv/config';
import logger from '../../utils/logger.js';

class UserSubscriptionService {
  constructor() {
    this.subscriptionTiers = this.initializeSubscriptionTiers();
    this.userSubscriptions = new Map();
    this.initialized = true;
    logger.info('User Subscription Service initialized');
  }

  initializeSubscriptionTiers() {
    return {
      starter: {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for getting started',
        monthlyPrice: 0,
        limits: {
          aiTokens: 10000,
          activeWorkflows: 2,
          blueprintBuilds: 5,
          automationCapacity: 5,
          storage: 1000000000, // 1GB
          apiCalls: 1000,
        },
        features: [
          'Basic AI access',
          'Up to 2 active workflows',
          '5 blueprint builds per month',
          'Basic support',
          'Community access',
        ],
        support: 'community',
      },
      builder: {
        id: 'builder',
        name: 'Builder',
        description: 'For active builders',
        monthlyPrice: 29,
        limits: {
          aiTokens: 50000,
          activeWorkflows: 5,
          blueprintBuilds: 20,
          automationCapacity: 20,
          storage: 5000000000, // 5GB
          apiCalls: 5000,
        },
        features: [
          'Enhanced AI access',
          'Up to 5 active workflows',
          '20 blueprint builds per month',
          'Email support',
          'Priority in community',
          'Advanced analytics',
        ],
        support: 'email',
      },
      operator: {
        id: 'operator',
        name: 'Operator',
        description: 'For power users',
        monthlyPrice: 99,
        limits: {
          aiTokens: 200000,
          activeWorkflows: 15,
          blueprintBuilds: 100,
          automationCapacity: 100,
          storage: 50000000000, // 50GB
          apiCalls: 50000,
        },
        features: [
          'Premium AI access',
          'Up to 15 active workflows',
          '100 blueprint builds per month',
          'Priority support',
          'Advanced analytics',
          'Custom integrations',
          'Dedicated account manager',
        ],
        support: 'priority',
      },
      empire: {
        id: 'empire',
        name: 'Empire',
        description: 'For enterprises',
        monthlyPrice: 499,
        limits: {
          aiTokens: 1000000,
          activeWorkflows: -1, // unlimited
          blueprintBuilds: -1, // unlimited
          automationCapacity: -1, // unlimited
          storage: 500000000000, // 500GB
          apiCalls: -1, // unlimited
        },
        features: [
          'Unlimited AI access',
          'Unlimited workflows',
          'Unlimited blueprint builds',
          'Dedicated support',
          'Advanced analytics',
          'Custom integrations',
          'Dedicated infrastructure',
          'SLA guarantee',
          'Custom training',
        ],
        support: 'dedicated',
      },
    };
  }

  getSubscriptionTiers() {
    return {
      tiers: Array.from(Object.values(this.subscriptionTiers)),
      count: Object.keys(this.subscriptionTiers).length,
      timestamp: new Date().toISOString(),
    };
  }

  getUserSubscriptionTier(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    let subscription = this.userSubscriptions.get(userId);
    if (!subscription) {
      // Default to starter tier
      subscription = {
        userId,
        tier: 'starter',
        status: 'active',
        startDate: new Date().toISOString(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.userSubscriptions.set(userId, subscription);
    }

    const tierData = this.subscriptionTiers[subscription.tier];

    return {
      userId,
      subscription: {
        tier: subscription.tier,
        tierName: tierData.name,
        status: subscription.status,
        startDate: subscription.startDate,
        renewalDate: subscription.renewalDate,
      },
      limits: tierData.limits,
      features: tierData.features,
      support: tierData.support,
      timestamp: new Date().toISOString(),
    };
  }

  validateSubscriptionAccess(userId, feature) {
    if (!userId || !feature) {
      return {
        valid: false,
        error: 'User ID and feature are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const subscription = this.getUserSubscriptionTier(userId);
    const tierData = this.subscriptionTiers[subscription.subscription.tier];

    if (!tierData) {
      return {
        valid: false,
        error: 'Subscription tier not found',
        code: 'TIER_NOT_FOUND',
      };
    }

    const hasFeature = tierData.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));

    if (!hasFeature) {
      return {
        valid: false,
        error: `Feature '${feature}' not available in ${tierData.name} tier`,
        code: 'FEATURE_NOT_AVAILABLE',
        requiredTier: this.getMinimumTierForFeature(feature),
      };
    }

    return {
      valid: true,
      message: `Feature '${feature}' is available`,
      code: 'FEATURE_AVAILABLE',
    };
  }

  checkUsageLimit(userId, limitType) {
    if (!userId || !limitType) {
      return {
        valid: false,
        error: 'User ID and limit type are required',
        code: 'MISSING_PARAMETERS',
      };
    }

    const subscription = this.getUserSubscriptionTier(userId);
    const tierData = this.subscriptionTiers[subscription.subscription.tier];

    if (!tierData.limits[limitType]) {
      return {
        valid: false,
        error: `Unknown limit type: ${limitType}`,
        code: 'UNKNOWN_LIMIT_TYPE',
      };
    }

    const limit = tierData.limits[limitType];
    const isUnlimited = limit === -1;

    return {
      valid: true,
      limitType,
      limit: isUnlimited ? 'unlimited' : limit,
      isUnlimited,
      code: 'LIMIT_CHECKED',
    };
  }

  getSubscriptionStatus(userId) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    const subscription = this.getUserSubscriptionTier(userId);
    const tierData = this.subscriptionTiers[subscription.subscription.tier];

    return {
      userId,
      status: {
        tier: subscription.subscription.tier,
        tierName: tierData.name,
        subscriptionStatus: subscription.subscription.status,
        startDate: subscription.subscription.startDate,
        renewalDate: subscription.subscription.renewalDate,
      },
      limits: tierData.limits,
      features: tierData.features,
      support: tierData.support,
      monthlyPrice: tierData.monthlyPrice,
      timestamp: new Date().toISOString(),
    };
  }

  getSubscriptionLimits(tier) {
    if (!tier || typeof tier !== 'string') {
      throw new Error('Tier is required and must be a string');
    }

    const tierData = this.subscriptionTiers[tier];
    if (!tierData) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    return {
      tier,
      tierName: tierData.name,
      limits: tierData.limits,
      timestamp: new Date().toISOString(),
    };
  }

  getAvailableFeatures(tier) {
    if (!tier || typeof tier !== 'string') {
      throw new Error('Tier is required and must be a string');
    }

    const tierData = this.subscriptionTiers[tier];
    if (!tierData) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    return {
      tier,
      tierName: tierData.name,
      features: tierData.features,
      featureCount: tierData.features.length,
      timestamp: new Date().toISOString(),
    };
  }

  prepareForBillingIntegration() {
    return {
      status: 'prepared',
      message: 'Subscription service prepared for billing integration',
      preparation: {
        tiersConfigured: true,
        limitsConfigured: true,
        featuresConfigured: true,
        userSubscriptionsTracked: true,
      },
      readyForBilling: true,
      note: 'Actual payment processing not yet implemented',
      timestamp: new Date().toISOString(),
    };
  }

  getMinimumTierForFeature(feature) {
    const featureLowercase = feature.toLowerCase();
    const tierOrder = ['starter', 'builder', 'operator', 'empire'];

    for (const tier of tierOrder) {
      const tierData = this.subscriptionTiers[tier];
      if (tierData.features.some(f => f.toLowerCase().includes(featureLowercase))) {
        return tier;
      }
    }

    return null;
  }

  setUserSubscriptionTier(userId, tier) {
    if (!userId || !tier) {
      throw new Error('User ID and tier are required');
    }

    if (!this.subscriptionTiers[tier]) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    const subscription = {
      userId,
      tier,
      status: 'active',
      startDate: new Date().toISOString(),
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.userSubscriptions.set(userId, subscription);
    logger.info(`User subscription tier set: ${userId} -> ${tier}`);

    return subscription;
  }
}

const userSubscriptionService = new UserSubscriptionService();

export default userSubscriptionService;
export { UserSubscriptionService };