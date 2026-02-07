/**
 * Models index - exports all models.
 */
const { User, SubscriptionTier, TIER_TOKEN_LIMITS } = require('./User');
const { TokenUsage } = require('./TokenUsage');

// Set up associations
User.hasMany(TokenUsage, { foreignKey: 'userId', as: 'tokenUsage' });
TokenUsage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  SubscriptionTier,
  TIER_TOKEN_LIMITS,
  TokenUsage,
};
