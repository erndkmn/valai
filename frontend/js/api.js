/**
 * API client for ValAI backend
 */
const API_BASE_URL = 'http://localhost:8000';

class ValAIAPI {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(error.detail || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getPlayers() {
        return this.request('/api/stats/players');
    }

    async getLastMatch(playerId = null) {
        const endpoint = playerId 
            ? `/api/stats/last-match?player_id=${playerId}`
            : '/api/stats/last-match';
        return this.request(endpoint);
    }

    async getStability(playerId, timeframe = 'all_time') {
        return this.request(`/api/stats/stability/${playerId}?timeframe=${timeframe}`);
    }

    async getMatches(playerId, limit = 5, timeframe = 'all_time') {
        return this.request(`/api/stats/matches/${playerId}?limit=${limit}&timeframe=${timeframe}`);
    }

    async getAvgHsRate(playerId, timeframe = 'all_time') {
        return this.request(`/api/stats/avg-hs-rate/${playerId}?timeframe=${timeframe}`);
    }
}

// Export singleton instance
const api = new ValAIAPI();
