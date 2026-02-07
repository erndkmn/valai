/**
 * API routes for Copilot chat functionality.
 * Uses OpenAI API to provide Valorant-focused AI assistance.
 *
 * Security & Limits:
 * - All OpenAI calls go through server (never trust client)
 * - Server-side max_tokens clamping (512 max)
 * - Rate limiting: 10 requests/minute per user
 * - Monthly token quotas: free=30k, standard=300k, pro=1M
 * - Atomic token deduction using OpenAI's usage.total_tokens
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const { User } = require('../../models');
const { decodeAccessToken } = require('../../services/authService');
const {
  checkRateLimit,
  getRateLimitHeaders,
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
} = require('../../services/rateLimitService');
const {
  checkQuota,
  deductTokensAtomic,
  clampMaxTokens,
  getUsageStats,
  QuotaExceededError,
  MAX_TOKENS_PER_REQUEST,
} = require('../../services/quotaService');

const router = express.Router();

// OpenAI configuration
const OPENAI_MODEL = 'gpt-3.5-turbo';

/**
 * Get OpenAI API key at runtime to ensure .env is loaded first.
 */
function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY || '';
}

// ============== Auth Middleware ==============

/**
 * Middleware to get the current authenticated user from JWT token.
 */
async function getCurrentUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      detail: 'Missing authorization header',
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = decodeAccessToken(token);

  if (!payload) {
    return res.status(401).json({
      detail: 'Invalid or expired token',
    });
  }

  const userId = payload.sub;
  if (!userId) {
    return res.status(401).json({
      detail: 'Invalid token payload',
    });
  }

  const user = await User.findByPk(parseInt(userId, 10));
  if (!user) {
    return res.status(401).json({
      detail: 'User not found',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      detail: 'Account is deactivated',
    });
  }

  req.user = user;
  next();
}

// ============== System Prompt ==============

const SYSTEM_PROMPT = `
You are ValAI Copilot called "Max Bot", an expert Valorant coach and statistics analyst. Your role is to:

1. ONLY discuss Valorant-related topics including:
   - Game mechanics, agents, abilities, weapons
   - Map strategies and callouts
   - Aiming techniques and crosshair placement
   - Performance analysis and improvement tips
   - Competitive play and ranked advice
   - The user's personal statistics (when provided)

2. If asked about non-Valorant topics, politely redirect the conversation back to Valorant.

3. When the user's stats are provided:
   - Always use them to give actionable and personalized advice.
   - When pointing out mistakes or weaknesses, always "prove it" with concrete data.
       Examples: low KAST, low survival rate, poor trade percentages, heatmap showing deaths in open areas, kill/assist ratios.
   - Provide context-specific examples to help the user understand why a behavior is hurting them.
   - Be encouraging but honest.

4. Be concise but comprehensive. Use bullet points for clarity.

5. If you don't have enough information, ask clarifying questions.

Remember: You are here to help players improve their Valorant gameplay through data-driven insights and expert coaching.
`;

// ============== Routes ==============

/**
 * POST /api/chat/completions - Handle chat completion requests.
 */
router.post(
  '/completions',
  getCurrentUser,
  [
    body('messages').isArray().withMessage('Messages must be an array'),
    body('messages.*.role').isString().withMessage('Each message must have a role'),
    body('messages.*.content').isString().withMessage('Each message must have content'),
    body('player_stats').optional(),
    body('max_tokens').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const user = req.user;

    // Step 1: Check rate limit
    const [allowed, remaining, resetIn] = await checkRateLimit(user.id);
    const rateLimitHeaders = getRateLimitHeaders(remaining, resetIn);

    // Set rate limit headers on response
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!allowed) {
      return res.status(429).json({
        detail: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        retry_after: resetIn,
      });
    }

    // Step 2: Check quota
    try {
      await checkQuota(user);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return res.status(403).json({
          detail: error.message,
          quota: {
            used: error.used,
            limit: error.limit,
            resets_at: error.resetDate,
          },
        });
      }
      throw error;
    }

    // Step 3: Get OpenAI API key
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return res.status(500).json({
        detail: 'OpenAI API key not configured',
      });
    }

    // Step 4: Clamp max_tokens
    const { messages, player_stats, max_tokens } = req.body;
    const clampedMaxTokens = clampMaxTokens(max_tokens);

    // Step 5: Build messages with system prompt
    const systemMessage = {
      role: 'system',
      content: player_stats
        ? `${SYSTEM_PROMPT}\n\nCurrent player stats:\n${JSON.stringify(player_stats, null, 2)}`
        : SYSTEM_PROMPT,
    };

    const fullMessages = [systemMessage, ...messages];

    // Step 6: Call OpenAI API
    try {
      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: fullMessages,
        max_tokens: clampedMaxTokens,
        temperature: 0.7,
      });

      // Step 7: Extract usage and deduct tokens atomically
      const usage = completion.usage;
      const totalTokens = usage?.total_tokens || 0;

      if (totalTokens > 0) {
        await deductTokensAtomic(user.id, totalTokens);
      }

      // Get updated usage stats
      const usageStats = await getUsageStats(user);

      res.json({
        message: completion.choices[0]?.message?.content || '',
        usage: {
          prompt_tokens: usage?.prompt_tokens || 0,
          completion_tokens: usage?.completion_tokens || 0,
          total_tokens: totalTokens,
          tokens_remaining: usageStats.tokensRemaining,
          tokens_limit: usageStats.tokensLimit,
        },
      });
    } catch (error) {
      console.error('OpenAI API error:', error);

      if (error.status === 401) {
        return res.status(500).json({
          detail: 'Invalid OpenAI API key',
        });
      }

      if (error.status === 429) {
        return res.status(503).json({
          detail: 'OpenAI service temporarily unavailable. Please try again later.',
        });
      }

      return res.status(500).json({
        detail: error.message || 'Failed to get chat completion',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/chat/usage - Get current user's token usage statistics.
 */
router.get('/usage', getCurrentUser, async (req, res) => {
  try {
    const usageStats = await getUsageStats(req.user);

    res.json({
      tokens_used: usageStats.tokensUsed,
      tokens_remaining: usageStats.tokensRemaining,
      tokens_limit: usageStats.tokensLimit,
      request_count: usageStats.requestCount,
      subscription_tier: usageStats.subscriptionTier,
      period: usageStats.period,
      resets_at: usageStats.resetsAt,
      usage_percentage: usageStats.usagePercentage,
    });
  } catch (error) {
    res.status(500).json({
      detail: error.message,
    });
  }
});

/**
 * GET /api/chat/limits - Get rate limit and quota information (no auth required).
 */
router.get('/limits', async (req, res) => {
  res.json({
    rate_limit: {
      requests_per_minute: RATE_LIMIT_REQUESTS,
      window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    },
    quotas: {
      free: 30000,
      standard: 300000,
      pro: 1000000,
    },
    max_tokens_per_request: MAX_TOKENS_PER_REQUEST,
    model: OPENAI_MODEL,
  });
});

module.exports = router;
