/**
 * User model for account management.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

/**
 * Subscription tiers with associated monthly token limits.
 */
const SubscriptionTier = {
  FREE: 'free',
  STANDARD: 'standard',
  PRO: 'pro',
};

/**
 * Monthly token limits per tier - single source of truth
 */
const TIER_TOKEN_LIMITS = {
  [SubscriptionTier.FREE]: 30000,
  [SubscriptionTier.STANDARD]: 300000,
  [SubscriptionTier.PRO]: 1000000,
};

/**
 * User model representing registered accounts.
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    validate: {
      len: [3, 50],
    },
  },
  hashedPassword: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'hashed_password',
  },
  // Valorant-specific fields
  riotId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'riot_id',
  },
  region: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  // Subscription tier - defaults to free
  subscriptionTier: {
    type: DataTypes.STRING(20),
    defaultValue: SubscriptionTier.FREE,
    allowNull: false,
    field: 'subscription_tier',
  },
  // Account status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified',
  },
  // Timestamps
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login',
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/**
 * Get the subscription tier as enum value.
 */
User.prototype.getTier = function() {
  return this.subscriptionTier;
};

/**
 * Get the monthly token limit for this user's tier.
 */
User.prototype.getMonthlyTokenLimit = function() {
  return TIER_TOKEN_LIMITS[this.subscriptionTier] || TIER_TOKEN_LIMITS[SubscriptionTier.FREE];
};

module.exports = {
  User,
  SubscriptionTier,
  TIER_TOKEN_LIMITS,
};
