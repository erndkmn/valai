/**
 * Token usage tracking model for monthly quota management.
 *
 * Design decisions:
 * - Row-per-month pattern: Each user gets a new row each month, enabling:
 *   - Natural monthly resets without batch jobs
 *   - Historical usage analytics
 *   - Simple atomic updates with row-level locking
 * - Composite unique constraint on (user_id, year, month) prevents duplicates
 * - tokens_used is the ONLY source of truth for usage (never trust client)
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

/**
 * Tracks monthly token usage per user.
 *
 * Each row represents one user's usage for one calendar month.
 * New rows are created lazily when a user makes their first request of the month.
 */
const TokenUsage = sequelize.define('TokenUsage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // Year and month for easy querying and partitioning
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12,
    },
  },
  // Total tokens consumed this month (from OpenAI's usage.total_tokens)
  tokensUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'tokens_used',
  },
  // Request count for rate limiting analytics
  requestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'request_count',
  },
}, {
  tableName: 'token_usage',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'year', 'month'],
      name: 'uq_user_month',
    },
    {
      fields: ['user_id', 'year', 'month'],
      name: 'ix_token_usage_user_period',
    },
  ],
});

module.exports = {
  TokenUsage,
};
