const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

class PremiumService {
  constructor() {
    this.pricingPlans = {
      basic: {
        name: 'Basic Premium',
        price: 5.00,
        currency: 'USD',
        features: [
          'Unlimited script generation',
          'High-quality audio narration',
          '3D video generation',
          'Priority processing',
          'Advanced customization options'
        ],
        limits: {
          scriptsPerMonth: -1, // unlimited
          audioGeneration: -1,
          videoGeneration: 10
        }
      },
      pro: {
        name: 'Pro Premium',
        price: 15.00,
        currency: 'USD',
        features: [
          'Everything in Basic',
          'Unlimited video generation',
          'Commercial usage rights',
          'API access',
          'Priority support'
        ],
        limits: {
          scriptsPerMonth: -1,
          audioGeneration: -1,
          videoGeneration: -1
        }
      }
    };
  }

  /**
   * Get available pricing plans
   */
  getPricingPlans() {
    return this.pricingPlans;
  }

  /**
   * Get plan details by name
   */
  getPlan(planName) {
    return this.pricingPlans[planName] || null;
  }

  /**
   * Create payment session for premium upgrade
   */
  async createPaymentSession(userId, planName, options = {}) {
    try {
      const plan = this.getPlan(planName);
      if (!plan) {
        throw new Error('Invalid plan name');
      }

      const sessionId = this.generateSessionId();
      const paymentData = {
        sessionId,
        userId,
        planName,
        plan,
        amount: plan.price,
        currency: plan.currency,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        ...options
      };

      // Store payment session in Redis
      const redis = getRedisClient();
      await redis.setEx(
        `payment_session:${sessionId}`,
        1800, // 30 minutes
        JSON.stringify(paymentData)
      );

      // Generate payment URL (in production, this would integrate with Stripe/PayPal)
      const paymentUrl = this.generatePaymentUrl(sessionId, plan);

      logger.info('Payment session created', {
        sessionId,
        userId,
        planName,
        amount: plan.price
      });

      return {
        sessionId,
        paymentUrl,
        amount: plan.price,
        currency: plan.currency,
        expiresAt: paymentData.expiresAt
      };

    } catch (error) {
      logger.error('Failed to create payment session', {
        error: error.message,
        userId,
        planName
      });
      throw error;
    }
  }

  /**
   * Verify payment completion
   */
  async verifyPayment(sessionId, paymentToken) {
    try {
      const redis = getRedisClient();
      const sessionData = await redis.get(`payment_session:${sessionId}`);
      
      if (!sessionData) {
        throw new Error('Payment session not found or expired');
      }

      const payment = JSON.parse(sessionData);
      
      if (payment.status !== 'pending') {
        throw new Error('Payment session already processed');
      }

      // In production, verify with payment provider
      const isPaymentValid = await this.verifyWithPaymentProvider(paymentToken, payment);
      
      if (!isPaymentValid) {
        throw new Error('Payment verification failed');
      }

      // Update payment status
      payment.status = 'completed';
      payment.completedAt = new Date().toISOString();
      payment.paymentToken = paymentToken;

      await redis.setEx(
        `payment_session:${sessionId}`,
        86400 * 7, // Keep for 7 days
        JSON.stringify(payment)
      );

      // Upgrade user to premium
      await this.upgradeUserToPremium(payment.userId, payment.planName);

      logger.info('Payment verified and user upgraded', {
        sessionId,
        userId: payment.userId,
        planName: payment.planName
      });

      return {
        success: true,
        userId: payment.userId,
        planName: payment.planName,
        upgradedAt: payment.completedAt
      };

    } catch (error) {
      logger.error('Payment verification failed', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Upgrade user to premium tier
   */
  async upgradeUserToPremium(userId, planName) {
    try {
      const redis = getRedisClient();
      const plan = this.getPlan(planName);
      
      if (!plan) {
        throw new Error('Invalid plan name');
      }

      const userTierData = {
        userId,
        planName,
        plan,
        upgradedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        status: 'active'
      };

      // Store user tier information
      await redis.setEx(
        `user_tier:${userId}`,
        86400 * 30, // 30 days
        planName
      );

      // Store detailed tier data
      await redis.setEx(
        `user_tier_data:${userId}`,
        86400 * 30,
        JSON.stringify(userTierData)
      );

      // Reset credits to unlimited for premium users
      await redis.setEx(
        `user_credits:${userId}`,
        86400 * 30,
        JSON.stringify({
          remaining: -1, // unlimited
          used: 0,
          total: -1,
          tier: planName
        })
      );

      logger.info('User upgraded to premium', {
        userId,
        planName,
        upgradedAt: userTierData.upgradedAt
      });

      return userTierData;

    } catch (error) {
      logger.error('Failed to upgrade user to premium', {
        error: error.message,
        userId,
        planName
      });
      throw error;
    }
  }

  /**
   * Check if user has premium access
   */
  async hasPremiumAccess(userId) {
    try {
      const redis = getRedisClient();
      const tier = await redis.get(`user_tier:${userId}`);
      
      if (!tier || tier === 'free') {
        return false;
      }

      // Check if subscription is still active
      const tierData = await redis.get(`user_tier_data:${userId}`);
      if (tierData) {
        const data = JSON.parse(tierData);
        const now = new Date();
        const expiresAt = new Date(data.expiresAt);
        
        if (now > expiresAt) {
          // Subscription expired, downgrade to free
          await this.downgradeToFree(userId);
          return false;
        }
      }

      return true;

    } catch (error) {
      logger.warn('Failed to check premium access', {
        error: error.message,
        userId
      });
      return false;
    }
  }

  /**
   * Downgrade user to free tier
   */
  async downgradeToFree(userId) {
    try {
      const redis = getRedisClient();
      
      // Remove premium tier data
      await redis.del(`user_tier:${userId}`);
      await redis.del(`user_tier_data:${userId}`);
      
      // Reset credits to free tier
      await redis.setEx(
        `user_credits:${userId}`,
        86400 * 30,
        JSON.stringify({
          remaining: 10,
          used: 0,
          total: 10,
          tier: 'free'
        })
      );

      logger.info('User downgraded to free tier', { userId });

    } catch (error) {
      logger.error('Failed to downgrade user', {
        error: error.message,
        userId
      });
    }
  }

  /**
   * Get user's current tier
   */
  async getUserTier(userId) {
    try {
      const redis = getRedisClient();
      const tier = await redis.get(`user_tier:${userId}`);
      return tier || 'free';
    } catch (error) {
      logger.warn('Failed to get user tier', {
        error: error.message,
        userId
      });
      return 'free';
    }
  }

  /**
   * Generate payment URL (mock implementation)
   */
  generatePaymentUrl(sessionId, plan) {
    // In production, this would generate a Stripe checkout URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3005';
    return `${baseUrl}/payment/checkout?session=${sessionId}&plan=${plan.name.toLowerCase()}`;
  }

  /**
   * Verify payment with provider (mock implementation)
   */
  async verifyWithPaymentProvider(paymentToken, payment) {
    // In production, this would verify with Stripe/PayPal
    // For now, accept any non-empty token
    return paymentToken && paymentToken.length > 0;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get payment session details
   */
  async getPaymentSession(sessionId) {
    try {
      const redis = getRedisClient();
      const sessionData = await redis.get(`payment_session:${sessionId}`);
      
      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData);

    } catch (error) {
      logger.error('Failed to get payment session', {
        error: error.message,
        sessionId
      });
      return null;
    }
  }
}

module.exports = PremiumService;