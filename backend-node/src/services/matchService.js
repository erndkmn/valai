/**
 * Match service for loading and processing match data.
 */
const fs = require('fs');
const path = require('path');
const { matchData } = require('../matchData');

/**
 * Load a single match JSON file and convert to player stats.
 * @param {string} filePath - Path to JSON file
 * @returns {Array<object>} Array of player statistics
 */
function loadMatchFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return matchData(data);
}

/**
 * Load all match files from the backend directory.
 * @param {string} [baseDir] - Base directory path (defaults to backend directory)
 * @param {number} [numMatches=10] - Maximum number of matches to load
 * @returns {Array<object>} Combined array with all match data
 */
function loadAllMatches(baseDir = null, numMatches = 10) {
  if (!baseDir) {
    // Default to backend directory (where response*.json files are)
    baseDir = path.join(__dirname, '..', '..');
  }

  const allPlayers = [];
  const filesFound = [];
  const filesNotFound = [];

  for (let i = 1; i <= numMatches; i++) {
    const fname = `response${i}.json`;
    const filePath = path.join(baseDir, fname);
    
    if (fs.existsSync(filePath)) {
      try {
        const players = loadMatchFile(filePath);
        allPlayers.push(...players);
        filesFound.push(fname);
      } catch (error) {
        console.error(`Error loading ${fname}:`, error.message);
      }
    } else {
      filesNotFound.push(fname);
    }
  }

  if (allPlayers.length === 0) {
    throw new Error(
      `No match data found! Searched in: ${baseDir}\n` +
      `Files found: ${filesFound.join(', ')}\n` +
      `Files not found: ${filesNotFound.slice(0, 5).join(', ')}...`
    );
  }

  // Sort by player_id and match_date
  allPlayers.sort((a, b) => {
    if (a.playerId < b.playerId) return -1;
    if (a.playerId > b.playerId) return 1;
    return a.matchDate - b.matchDate;
  });

  return allPlayers;
}

/**
 * Get statistics from the last match.
 * @param {Array<object>} matches - Array of match data
 * @param {string} [playerId] - Optional player ID to filter
 * @returns {object} Last match statistics
 */
function getLastMatchStats(matches, playerId = null) {
  if (playerId) {
    const playerData = matches.filter(m => m.playerId === playerId);
    if (playerData.length === 0) {
      return { error: 'Player not found' };
    }
    const lastMatch = playerData[playerData.length - 1];
    return formatMatchStats(lastMatch);
  }

  // Get the most recent match date across all players
  const lastDate = Math.max(...matches.map(m => m.matchDate.getTime()));
  const lastMatchData = matches.filter(m => m.matchDate.getTime() === lastDate);
  
  if (lastMatchData.length === 0) {
    return { error: 'No matches found' };
  }

  return formatMatchStats(lastMatchData[0]);
}

/**
 * Format match statistics for API response.
 * @param {object} match - Match data
 * @returns {object} Formatted statistics
 */
function formatMatchStats(match) {
  return {
    player_id: match.playerId,
    hs_rate: Math.round(match.hsRate * 100) / 100,
    total_kills: match.totalKills,
    total_shots: match.totalShots,
    hs_count: match.hsCount,
    match_date: match.matchDate.toISOString(),
  };
}

/**
 * Get last N matches for a player.
 * @param {Array<object>} matches - Array of match data
 * @param {string} playerId - Player UUID
 * @param {number} [n=5] - Number of matches to return
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Array<object>} List of match dictionaries
 */
function getLastNMatches(matches, playerId, n = 5, startDate = null, endDate = null) {
  let playerData = matches.filter(m => m.playerId === playerId);
  
  if (playerData.length === 0) {
    return [];
  }

  // Filter by date range if provided
  if (startDate) {
    playerData = playerData.filter(m => m.matchDate >= startDate);
  }
  if (endDate) {
    playerData = playerData.filter(m => m.matchDate <= endDate);
  }

  if (playerData.length === 0) {
    return [];
  }

  // Get last N matches (sorted by date, most recent first)
  playerData.sort((a, b) => b.matchDate - a.matchDate);
  const lastN = playerData.slice(0, n);

  return lastN.map(match => ({
    hs_rate: Math.round(match.hsRate * 100) / 100,
    total_kills: match.totalKills,
    total_shots: match.totalShots,
    hs_count: match.hsCount,
    match_date: match.matchDate.toISOString(),
  }));
}

/**
 * Get average headshot rate for a player within a timeframe.
 * @param {Array<object>} matches - Array of match data
 * @param {string} playerId - Player UUID
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {number|null} Average headshot rate or null if no data
 */
function getAverageHsRate(matches, playerId, startDate = null, endDate = null) {
  let playerData = matches.filter(m => m.playerId === playerId);

  if (playerData.length === 0) {
    return null;
  }

  if (startDate) {
    playerData = playerData.filter(m => m.matchDate >= startDate);
  }
  if (endDate) {
    playerData = playerData.filter(m => m.matchDate <= endDate);
  }

  if (playerData.length === 0) {
    return null;
  }

  const sum = playerData.reduce((acc, m) => acc + m.hsRate, 0);
  return Math.round((sum / playerData.length) * 100) / 100;
}

module.exports = {
  loadMatchFile,
  loadAllMatches,
  getLastMatchStats,
  getLastNMatches,
  getAverageHsRate,
};
