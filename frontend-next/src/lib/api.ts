/**
 * API client for ValAI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Player {
  players: string[];
  count: number;
}

export interface TrendData {
  stability_scores: number[];
  hs_rates: number[];
  dates: string[];
}

export interface StabilityData {
  score: number;
  score_raw?: number;
  category: string;
  label: string;
  color: string;
  volatility: number;
  description: string;
  current_hs_rate: number;
  avg_hs_rate: number;
  match_count: number;
  empty?: boolean;
  trend: TrendData;
}

export interface Match {
  match_date: string;
  hs_rate: number;
  total_kills: number;
  total_shots: number;
  headshots: number;
}

export interface MatchesData {
  player_id: string;
  matches: Match[];
  count: number;
  empty?: boolean;
}

export interface AvgHsRateData {
  player_id: string;
  avg_hs_rate: number;
  timeframe: string;
  empty?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

class ValAIAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
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

  async getPlayers(): Promise<Player> {
    return this.request<Player>('/api/stats/players');
  }

  async getLastMatch(playerId: string | null = null) {
    const endpoint = playerId 
      ? `/api/stats/last-match?player_id=${playerId}`
      : '/api/stats/last-match';
    return this.request(endpoint);
  }

  async getStability(playerId: string, timeframe: string = 'all_time'): Promise<StabilityData> {
    return this.request<StabilityData>(`/api/stats/stability/${playerId}?timeframe=${timeframe}`);
  }

  async getMatches(playerId: string, limit: number = 5, timeframe: string = 'all_time'): Promise<MatchesData> {
    return this.request<MatchesData>(`/api/stats/matches/${playerId}?limit=${limit}&timeframe=${timeframe}`);
  }

  async getAvgHsRate(playerId: string, timeframe: string = 'all_time'): Promise<AvgHsRateData> {
    return this.request<AvgHsRateData>(`/api/stats/avg-hs-rate/${playerId}?timeframe=${timeframe}`);
  }

  async sendChatMessage(messages: ChatMessage[], playerStats: object | null): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        player_stats: playerStats
      })
    });
  }

  async checkChatHealth(): Promise<{ status: string; has_api_key: boolean }> {
    return this.request('/api/chat/health');
  }
}

// Export singleton instance
export const api = new ValAIAPI();
