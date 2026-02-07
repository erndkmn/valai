/**
 * API routes for statistics endpoints.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const {
  loadAllMatches,
  getLastMatchStats,
  getLastNMatches,
  getAverageHsRate,
} = require('../../services/matchService');
const {
  computeRollingStats,
  getPlayerStability,
} = require('../../services/stabilityService');

const router = express.Router();

/**
 * Convert timeframe string to start and end dates.
 * @param {string} timeframe - Timeframe string
 * @returns {[Date|null, Date|null]} Tuple of (startDate, endDate)
 */
function getTimeframeDates(timeframe) {
  const now = new Date();
  let startDate = null;
  let endDate = null;

  switch (timeframe) {
    case 'today':
      startDate = new Date(now);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = now;
      break;
    case 'yesterday':
      startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 1);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setUTCHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 7);
      endDate = now;
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 30);
      endDate = now;
      break;
    case 'season':
      startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 90);
      endDate = now;
      break;
    case 'all_time':
    case 'all':
    default:
      startDate = null;
      endDate = null;
      break;
  }

  return [startDate, endDate];
}

/**
 * GET /api/stats/last-match - Get statistics from the last match.
 */
router.get('/last-match', async (req, res) => {
  try {
    const playerId = req.query.player_id || null;
    const matches = loadAllMatches();
    const stats = getLastMatchStats(matches, playerId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * GET /api/stats/stability/:playerId - Get stability analysis for a specific player.
 */
router.get('/stability/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const timeframe = req.query.timeframe || 'all_time';

    const matches = loadAllMatches();
    const matchesWithStats = computeRollingStats(matches);

    const [startDate, endDate] = getTimeframeDates(timeframe);
    const stability = getPlayerStability(matchesWithStats, playerId, startDate, endDate);

    if (!stability) {
      // Return empty state data instead of 404 for timeframe with no matches
      return res.json({
        score: 0,
        score_raw: 0,
        category: 'no_data',
        label: 'No Data',
        color: '#666666',
        volatility: 0,
        description: 'No matches played during this time frame.',
        current_hs_rate: 0,
        avg_hs_rate: 0,
        match_count: 0,
        empty: true,
        trend: {
          stability_scores: [],
          hs_rates: [],
          dates: [],
        },
      });
    }

    res.json(stability);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * GET /api/stats/matches/:playerId - Get recent matches for a player.
 */
router.get('/matches/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 5;
    const timeframe = req.query.timeframe || 'all_time';

    const matches = loadAllMatches();
    const [startDate, endDate] = getTimeframeDates(timeframe);
    const recentMatches = getLastNMatches(matches, playerId, limit, startDate, endDate);

    // Return empty array instead of 404 for timeframe with no matches
    if (recentMatches.length === 0) {
      return res.json({
        player_id: playerId,
        matches: [],
        count: 0,
        empty: true,
      });
    }

    res.json({
      player_id: playerId,
      matches: recentMatches,
      count: recentMatches.length,
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * GET /api/stats/avg-hs-rate/:playerId - Get average headshot rate for a player.
 */
router.get('/avg-hs-rate/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const timeframe = req.query.timeframe || 'all_time';

    const matches = loadAllMatches();
    const [startDate, endDate] = getTimeframeDates(timeframe);
    const avgRate = getAverageHsRate(matches, playerId, startDate, endDate);

    // Handle null case for empty timeframe
    if (avgRate === null) {
      return res.json({
        player_id: playerId,
        avg_hs_rate: 0,
        timeframe,
        empty: true,
      });
    }

    res.json({
      player_id: playerId,
      avg_hs_rate: avgRate,
      timeframe,
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * GET /api/stats/players - Get list of all players in the dataset.
 */
router.get('/players', async (req, res) => {
  try {
    const matches = loadAllMatches();
    const playerIds = [...new Set(matches.map(m => m.playerId))];
    res.json({
      players: playerIds,
      count: playerIds.length,
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

/**
 * GET /api/stats/match - Get raw match data from response1.json.
 */
router.get('/match', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', '..', '..', 'response1.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      res.json(data);
    } else {
      res.status(404).json({ detail: 'Match data file not found' });
    }
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
