/**
 * Match data processing - converts Valorant API match data to structured format.
 */

/**
 * Convert Unix timestamp in milliseconds to Date object.
 * @param {number} timestampMs - Unix timestamp in milliseconds
 * @returns {Date} Date object
 */
function convertDate(timestampMs) {
  return new Date(timestampMs);
}

/**
 * Process raw Valorant match data into structured player statistics.
 * @param {object} data - Raw match data from Valorant API
 * @returns {Array<object>} Array of player statistics
 */
function matchData(data) {
  const players = {};
  const rounds = data.roundResults || [];

  // Accumulate headshots and total shots for each player
  for (const round of rounds) {
    for (const player of round.playerStats || []) {
      const puuid = player.puuid;
      
      if (!players[puuid]) {
        players[puuid] = {
          playerId: puuid,
          totalKills: 0,
          totalShots: 0,
          hsCount: 0,
          hsRate: 0.0,
        };
      }

      players[puuid].totalKills += (player.kills || []).length;
      
      const damage = player.damage || [];
      for (const dmg of damage) {
        players[puuid].totalShots += (dmg.legshots || 0) + (dmg.bodyshots || 0) + (dmg.headshots || 0);
        players[puuid].hsCount += dmg.headshots || 0;
      }
    }
  }

  // Calculate headshot rate for each player
  for (const player of Object.values(players)) {
    if (player.totalShots > 0) {
      player.hsRate = (player.hsCount / player.totalShots) * 100;
    } else {
      player.hsRate = 0.0;
    }
  }

  // Add match date to all players
  const matchDate = convertDate(data.matchInfo?.gameStartMillis || Date.now());
  
  return Object.values(players).map(player => ({
    ...player,
    matchDate,
  }));
}

module.exports = {
  matchData,
  convertDate,
};
