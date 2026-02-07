/**
 * Stability service for calculating and categorizing player stability scores.
 */

/**
 * Stability score thresholds and categories.
 * Updated for 0-100 scale: 71-100 = stable, 31-70 = inconsistent, 0-30 = unstable
 */
const STABILITY_THRESHOLDS = {
  very_stable: { min: 0.71, label: 'Very Stable', color: '#10B981', volatilityMax: 1.0 },
  stable: { min: 0.71, label: 'Stable', color: '#34D399', volatilityMax: 2.0 },
  somewhat_stable: { min: 0.31, label: 'Inconsistent', color: '#FBBF24', volatilityMax: 4.0 },
  not_stable: { min: 0.31, label: 'Inconsistent', color: '#F97316', volatilityMax: 6.0 },
  very_unstable: { min: 0.0, label: 'Unstable', color: '#b33a3c', volatilityMax: 100.0 },
};

/**
 * Get human-readable description for stability category.
 * @param {string} category - Stability category
 * @returns {string} Description
 */
function getDescription(category) {
  const descriptions = {
    very_stable: "Excellent consistency - Your headshot rate is very consistent across matches.",
    stable: "Good consistency - Your performance is relatively stable.",
    somewhat_stable: "Average consistency - Some variation in your performance.",
    not_stable: "Poor consistency - Significant variation in your headshot rate.",
    very_unstable: "Very poor consistency - Your performance varies greatly between matches.",
  };
  return descriptions[category] || '';
}

/**
 * Categorize a stability score into a label and metadata.
 * @param {number} score01 - Stability score (0-1 range, higher is more stable)
 * @returns {object} Dictionary with category, label, color, and volatility info
 */
function categorizeStabilityScore(score01) {
  // Convert to 0-100 for categorization
  const score0100 = score01 * 100;
  
  let category;
  if (score0100 >= 71) {
    category = 'very_stable'; // 71-100: Stable
  } else if (score0100 >= 31) {
    category = 'somewhat_stable'; // 31-70: Inconsistent
  } else {
    category = 'very_unstable'; // 0-30: Unstable
  }

  const thresholdInfo = STABILITY_THRESHOLDS[category];
  
  // Calculate approximate volatility from score (inverse: volatility = (1/score) - 1)
  const volatility = score01 > 0 ? (1 / score01) - 1 : 100.0;
  
  // Convert to 0-100 scale (integer)
  const scoreRounded = Math.round(score01 * 100);

  return {
    score: scoreRounded, // Now 0-100 integer
    score_raw: Math.round(score01 * 10000) / 10000, // Keep raw for internal use
    category,
    label: thresholdInfo.label,
    color: thresholdInfo.color,
    volatility: Math.round(volatility * 100) / 100,
    description: getDescription(category),
  };
}

/**
 * Calculate standard deviation.
 * @param {Array<number>} values - Array of numbers
 * @returns {number} Standard deviation
 */
function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute rolling statistics for stability analysis.
 * @param {Array<object>} matches - Array of match data with playerId, hsRate, matchDate
 * @param {number} [window=3] - Rolling window size
 * @returns {Array<object>} Array with additional computed fields
 */
function computeRollingStats(matches, window = 3) {
  // Group by player
  const playerGroups = {};
  for (const match of matches) {
    if (!playerGroups[match.playerId]) {
      playerGroups[match.playerId] = [];
    }
    playerGroups[match.playerId].push({ ...match });
  }

  const result = [];

  for (const playerId of Object.keys(playerGroups)) {
    const playerMatches = playerGroups[playerId];
    
    // Sort by date
    playerMatches.sort((a, b) => a.matchDate - b.matchDate);

    for (let i = 0; i < playerMatches.length; i++) {
      const match = playerMatches[i];
      
      // Get window of matches (up to current)
      const windowStart = Math.max(0, i - window + 1);
      const windowMatches = playerMatches.slice(windowStart, i + 1);
      const rates = windowMatches.map(m => m.hsRate);

      // Rolling mean
      const hsRolling3 = rates.reduce((a, b) => a + b, 0) / rates.length;
      
      // Delta from rolling mean
      const hsDelta = match.hsRate - hsRolling3;
      
      // Rolling standard deviation (volatility)
      const hsVolatility3 = rates.length >= 2 ? standardDeviation(rates) : 0;
      
      // Stability score: 1 / (1 + volatility)
      const stabilityScore = 1 / (1 + hsVolatility3);

      result.push({
        ...match,
        hsRolling3,
        hsDelta,
        hsVolatility3,
        stabilityScore,
      });
    }
  }

  return result;
}

/**
 * Get stability analysis for a specific player.
 * @param {Array<object>} matches - Array with stability scores computed
 * @param {string} playerId - Player UUID to analyze
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {object|null} Dictionary with stability information or null if player not found
 */
function getPlayerStability(matches, playerId, startDate = null, endDate = null) {
  let playerData = matches.filter(m => m.playerId === playerId);

  if (playerData.length === 0) {
    return null;
  }

  // Filter by date range if provided
  if (startDate) {
    playerData = playerData.filter(m => m.matchDate >= startDate);
  }
  if (endDate) {
    playerData = playerData.filter(m => m.matchDate <= endDate);
  }

  if (playerData.length === 0) {
    return null;
  }

  // Sort by date
  playerData.sort((a, b) => a.matchDate - b.matchDate);

  // Get the latest stability score
  const latest = playerData[playerData.length - 1];
  const stabilityScore = latest.stabilityScore;

  // Get all stability scores for trend (convert to 0-100 scale)
  const stabilityScores = playerData.map(m => Math.round(m.stabilityScore * 100));
  const hsRates = playerData.map(m => m.hsRate);
  const dates = playerData.map(m => m.matchDate);

  // Calculate average HS rate for the filtered period
  const avgHsRate = Math.round((hsRates.reduce((a, b) => a + b, 0) / hsRates.length) * 100) / 100;

  const categoryInfo = categorizeStabilityScore(stabilityScore);

  return {
    ...categoryInfo,
    current_hs_rate: Math.round(latest.hsRate * 100) / 100,
    avg_hs_rate: avgHsRate,
    volatility: Math.round(latest.hsVolatility3 * 100) / 100,
    match_count: playerData.length,
    trend: {
      stability_scores: stabilityScores,
      hs_rates: hsRates.map(h => Math.round(h * 100) / 100),
      dates: dates.map(d => d.toISOString()),
    },
  };
}

module.exports = {
  STABILITY_THRESHOLDS,
  categorizeStabilityScore,
  computeRollingStats,
  getPlayerStability,
};
