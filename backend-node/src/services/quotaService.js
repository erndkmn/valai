/**
 * Quota service for managing monthly token limits.
 *
 * Handles:
 * - Checking remaining quota before requests
 * - Atomic token deduction after OpenAI responses
 * - Monthly row creation (row-per-month pattern)
 * - Race condition prevention with database locking
 */
const { Op } = require('sequelize');
const { sequelize } = require('../database');
const { TokenUsage } = require('../models');
const { TIER_TOKEN_LIMITS, SubscriptionTier } = require('../models');

// Maximum tokens per request (server-side clamp)
const MAX_TOKENS_PER_REQUEST = 512;

/**
 * Error thrown when user has exceeded their monthly token quota.
 */
class QuotaExceededError extends Error {
  constructor(used, limit, resetDate) {
    super(`Monthly token quota exceeded: ${used}/${limit}. Resets ${resetDate}`);
    this.name = 'QuotaExceededError';
    this.used = used;
    this.limit = limit;
    this.resetDate = resetDate;
  }
}

/**
 * Error thrown when user doesn't have enough quota for the estimated request.
 */
class InsufficientQuotaError extends Error {
  constructor(remaining, required) {
    super(`Insufficient quota: ${remaining} remaining, ~${required} required`);
    this.name = 'InsufficientQuotaError';
    this.remaining = remaining;
    this.required = required;
  }
}

/**
 * Get current year and month for quota period.
 * @returns {[number, number]} Tuple of (year, month)
 */
function getCurrentPeriod() {
  const now = new Date();
  return [now.getUTCFullYear(), now.getUTCMonth() + 1];
}

/**
 * Get the date string when quota resets (1st of next month).
 * @returns {string} Reset date string
 */
function getNextResetDate() {
  const now = new Date();
  const year = now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 11 ? 1 : now.getUTCMonth() + 2;
  return `${year}-${month.toString().padStart(2, '0')}-01`;
}

/**
 * Get or create the usage record for current month.
 * @param {number} userId - User ID
 * @param {object} [transaction] - Optional transaction
 * @returns {Promise<TokenUsage>} Usage record
 */
async function getOrCreateUsageRecord(userId, transaction = null) {
  const [year, month] = getCurrentPeriod();

  // Try to get existing record first (fast path)
  let usage = await TokenUsage.findOne({
    where: {
      userId,
      year,
      month,
    },
    transaction,
  });

  if (usage) {
    return usage;
  }

  // Create new record for this month
  try {
    usage = await TokenUsage.create({
      userId,
      year,
      month,
      tokensUsed: 0,
      requestCount: 0,
    }, { transaction });
    return usage;
  } catch (error) {
    // Race condition: another request created it first
    if (error.name === 'SequelizeUniqueConstraintError') {
      return TokenUsage.findOne({
        where: {
          userId,
          year,
          month,
        },
        transaction,
      });
    }
    throw error;
  }
}

/**
 * Check user's remaining quota without modifying it.
 * @param {User} user - User object with subscription tier
 * @returns {Promise<[number, number, number]>} Tuple of (remaining, used, limit)
 * @throws {QuotaExceededError} If quota is already exceeded
 */
async function checkQuota(user) {
  const usage = await getOrCreateUsageRecord(user.id);
  const limit = user.getMonthlyTokenLimit();
  const used = usage.tokensUsed;
  const remaining = Math.max(0, limit - used);

  if (remaining === 0) {
    throw new QuotaExceededError(used, limit, getNextResetDate());
  }

  return [remaining, used, limit];
}

/**
 * Check if user has enough quota for an estimated request.
 * @param {User} user - User object
 * @param {number} estimatedTokens - Estimated tokens for the request
 * @returns {Promise<boolean>} True if sufficient quota
 * @throws {QuotaExceededError} If quota is fully exhausted
 * @throws {InsufficientQuotaError} If not enough quota for request
 */
async function checkQuotaSufficient(user, estimatedTokens) {
  const [remaining, used, limit] = await checkQuota(user);

  if (remaining < estimatedTokens) {
    throw new InsufficientQuotaError(remaining, estimatedTokens);
  }

  return true;
}

/**
 * Atomically deduct tokens after OpenAI response.
 * Uses transaction with row-level locking to prevent race conditions.
 * @param {number} userId - User ID
 * @param {number} tokensUsed - Actual tokens used from OpenAI response
 * @returns {Promise<TokenUsage>} Updated usage record
 */
async function deductTokensAtomic(userId, tokensUsed) {
  return sequelize.transaction(async (transaction) => {
    const [year, month] = getCurrentPeriod();

    // Lock the row for update
    let usage = await TokenUsage.findOne({
      where: {
        userId,
        year,
        month,
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!usage) {
      // Create if doesn't exist
      usage = await TokenUsage.create({
        userId,
        year,
        month,
        tokensUsed: 0,
        requestCount: 0,
      }, { transaction });
    }

    // Update atomically
    usage.tokensUsed += tokensUsed;
    usage.requestCount += 1;
    await usage.save({ transaction });

    return usage;
  });
}

/**
 * Clamp max_tokens to server-enforced limit.
 * @param {number|null} requestedMaxTokens - Client-requested max tokens
 * @returns {number} Clamped max tokens value
 */
function clampMaxTokens(requestedMaxTokens) {
  if (requestedMaxTokens === null || requestedMaxTokens === undefined) {
    return MAX_TOKENS_PER_REQUEST;
  }
  return Math.min(Math.max(1, requestedMaxTokens), MAX_TOKENS_PER_REQUEST);
}

/**
 * Get usage statistics for a user.
 * @param {User} user - User object
 * @returns {Promise<object>} Usage statistics
 */
async function getUsageStats(user) {
  const usage = await getOrCreateUsageRecord(user.id);
  const limit = user.getMonthlyTokenLimit();
  const used = usage.tokensUsed;
  const remaining = Math.max(0, limit - used);
  const [year, month] = getCurrentPeriod();

  return {
    tokensUsed: used,
    tokensRemaining: remaining,
    tokensLimit: limit,
    requestCount: usage.requestCount,
    subscriptionTier: user.subscriptionTier,
    period: `${year}-${month.toString().padStart(2, '0')}`,
    resetsAt: getNextResetDate(),
    usagePercentage: Math.round((used / limit) * 100 * 100) / 100,
  };
}

module.exports = {
  MAX_TOKENS_PER_REQUEST,
  QuotaExceededError,
  InsufficientQuotaError,
  getCurrentPeriod,
  getNextResetDate,
  getOrCreateUsageRecord,
  checkQuota,
  checkQuotaSufficient,
  deductTokensAtomic,
  clampMaxTokens,
  getUsageStats,
};
