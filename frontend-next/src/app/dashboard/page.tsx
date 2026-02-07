'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api, StabilityData, Match } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProBadge from '@/components/ProBadge';

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Stats data
  const [stabilityData, setStabilityData] = useState<StabilityData | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const data = await api.getPlayers();
        setPlayers(data.players);
        
        // If user has riot_id, try to match it with available players
        if (user?.riot_id && data.players.includes(user.riot_id)) {
          setSelectedPlayer(user.riot_id);
        } else if (data.players.length > 0) {
          setSelectedPlayer(data.players[0]);
        }
      } catch (err) {
        console.error('Failed to load players:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, [user?.riot_id]);

  // Load stats when player is selected
  useEffect(() => {
    const loadStats = async () => {
      if (!selectedPlayer) return;
      
      setStatsLoading(true);
      try {
        const [stability, matchesData] = await Promise.all([
          api.getStability(selectedPlayer, 'all_time'),
          api.getMatches(selectedPlayer, 3, 'all_time')
        ]);
        setStabilityData(stability);
        setRecentMatches(matchesData.matches);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [selectedPlayer]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navigateToTab = (tab: string) => {
    if (selectedPlayer) {
      router.push(`/player/${encodeURIComponent(selectedPlayer)}?tab=${tab}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg-color text-text-primary">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-bg-color/80 backdrop-blur-md border-b border-border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-valorant text-2xl font-bold bg-gradient-to-r from-red-highlight to-red-highlight-light bg-clip-text text-transparent">
                vAlAI
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {/* Player selector in navbar */}
              {!loading && players.length > 0 && (
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="px-3 py-2 bg-card-bg border border-border-color rounded-lg text-text-primary text-sm focus:outline-none focus:border-red-highlight transition-colors"
                >
                  {players.map((player) => (
                    <option key={player} value={player}>
                      {player}
                    </option>
                  ))}
                </select>
              )}

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-card-bg transition-colors"
                >
                  <div className="w-8 h-8 bg-red-highlight rounded-full flex items-center justify-center text-white font-medium">
                    {user?.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-text-primary">{user?.username}</span>
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-card-bg border border-border-color rounded-lg shadow-lg py-1">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-color transition-colors"
                    >
                      Profile Settings
                    </Link>
                    <Link
                      href="/pricing"
                      className="block px-4 py-2 text-cyan-500 hover:bg-bg-color transition-colors"
                    >
                      ✨ Upgrade to Pro
                    </Link>
                    <hr className="my-1 border-border-color" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-color transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome back, {user?.username}! 👋
          </h1>
          <p className="text-text-secondary">
            {selectedPlayer ? `Viewing stats for ${selectedPlayer}` : 'Select a player to view analytics'}
          </p>
        </div>

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Stability Card */}
          <div 
            onClick={() => navigateToTab('stability')}
            className="bg-card-bg border border-border-color rounded-xl p-6 cursor-pointer hover:border-red-highlight transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-3 mb-4">
              <img src="/icons/stability_icon.png" alt="Stability" className="w-8 h-8 group-hover:hidden" />
              <img src="/icons/stabilityRed_icon.png" alt="Stability" className="w-8 h-8 hidden group-hover:block" />
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-red-highlight transition-colors">Stability</h2>
              <svg className="w-5 h-5 text-text-tertiary ml-auto group-hover:text-red-highlight transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-12 bg-bg-color rounded-lg mb-3"></div>
                <div className="h-4 bg-bg-color rounded w-3/4"></div>
              </div>
            ) : stabilityData && !stabilityData.empty ? (
              <>
                <div className="flex items-center gap-4 mb-3">
                  <div 
                    className="text-4xl font-bold"
                    style={{ color: stabilityData.color }}
                  >
                    {stabilityData.score}
                  </div>
                  <div 
                    className="px-3 py-1 rounded-full text-white text-sm font-semibold"
                    style={{ backgroundColor: stabilityData.color }}
                  >
                    {stabilityData.label}
                  </div>
                </div>
                <p className="text-text-secondary text-sm line-clamp-2">{stabilityData.description}</p>
                <div className="flex gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-text-tertiary">Avg HS: </span>
                    <span className="text-text-primary font-semibold">{stabilityData.avg_hs_rate}%</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Matches: </span>
                    <span className="text-text-primary font-semibold">{stabilityData.match_count}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-text-muted">
                <p className="text-2xl font-bold mb-2">—</p>
                <p className="text-sm">No stability data available</p>
              </div>
            )}
          </div>

          {/* Positioning Card */}
          <div 
            onClick={() => navigateToTab('positioning')}
            className="bg-card-bg border border-border-color rounded-xl p-6 cursor-pointer hover:border-red-highlight transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-3 mb-4">
              <img src="/icons/positioning_icon.png" alt="Positioning" className="w-8 h-8 group-hover:hidden" />
              <img src="/icons/positioningRed_icon.png" alt="Positioning" className="w-8 h-8 hidden group-hover:block" />
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-red-highlight transition-colors">Positioning</h2>
              <svg className="w-5 h-5 text-text-tertiary ml-auto group-hover:text-red-highlight transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex items-center justify-center h-24 text-text-muted">
              <div className="text-center">
                <p className="text-lg font-semibold mb-1">Coming Soon</p>
                <p className="text-sm text-text-tertiary">Analyze your map positioning</p>
              </div>
            </div>
          </div>

          {/* Prediction Card */}
          <div 
            onClick={() => navigateToTab('prediction')}
            className="bg-card-bg border border-border-color rounded-xl p-6 cursor-pointer hover:border-cyan-500 transition-all duration-200 hover:-translate-y-1 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full"></div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/icons/prediction_icon.png" alt="Prediction" className="w-8 h-8 group-hover:hidden" />
              <img src="/icons/predictionCyan_icon.png" alt="Prediction" className="w-8 h-8 hidden group-hover:block" />
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-cyan-500 transition-colors">Prediction</h2>
              <ProBadge />
              <svg className="w-5 h-5 text-text-tertiary ml-auto group-hover:text-cyan-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex items-center justify-center h-24 text-text-muted">
              <div className="text-center">
                <p className="text-lg font-semibold mb-1">Coming Soon</p>
                <p className="text-sm text-text-tertiary">AI-powered performance predictions</p>
              </div>
            </div>
          </div>

          {/* Copilot Card */}
          <div 
            onClick={() => navigateToTab('copilot')}
            className="bg-card-bg border border-border-color rounded-xl p-6 cursor-pointer hover:border-cyan-500 transition-all duration-200 hover:-translate-y-1 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full"></div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/icons/copilot_icon.png" alt="Copilot" className="w-8 h-8 group-hover:hidden" />
              <img src="/icons/copilotCyan_icon.png" alt="Copilot" className="w-8 h-8 hidden group-hover:block" />
              <h2 className="text-lg font-semibold text-text-primary group-hover:text-cyan-500 transition-colors">AI Copilot</h2>
              <ProBadge />
              <svg className="w-5 h-5 text-text-tertiary ml-auto group-hover:text-cyan-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="text-text-secondary">
              <p className="text-sm mb-3">Get personalized coaching advice powered by AI</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-bg-color rounded text-xs text-text-tertiary">Ask questions</span>
                <span className="px-2 py-1 bg-bg-color rounded text-xs text-text-tertiary">Get tips</span>
                <span className="px-2 py-1 bg-bg-color rounded text-xs text-text-tertiary">Improve</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Matches Preview */}
        <div className="bg-card-bg border border-border-color rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Recent Matches</h2>
            {selectedPlayer && (
              <button
                onClick={() => navigateToTab('stability')}
                className="text-sm text-red-highlight hover:text-red-highlight-light transition-colors flex items-center gap-1"
              >
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          
          {statsLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-bg-color rounded-lg"></div>
              ))}
            </div>
          ) : recentMatches.length > 0 ? (
            <div className="space-y-3">
              {recentMatches.map((match, index) => (
                <div
                  key={index}
                  className="bg-bg-color p-4 rounded-lg flex justify-between items-center flex-wrap gap-4"
                >
                  <div>
                    <div className="text-text-tertiary text-xs uppercase tracking-wider">
                      {new Date(match.match_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-text-tertiary text-xs uppercase">HS Rate</div>
                      <div className="text-red-highlight font-bold">{match.hs_rate.toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-tertiary text-xs uppercase">Kills</div>
                      <div className="text-text-primary font-semibold">{match.total_kills}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-tertiary text-xs uppercase">Shots</div>
                      <div className="text-text-primary font-semibold">{match.total_shots}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <p>No recent matches found</p>
            </div>
          )}
        </div>

        {/* Quick Links Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Link Riot Account Card */}
          <div className="bg-card-bg border border-border-color rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Your Riot ID</h2>
            {user?.riot_id ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-highlight/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-text-primary font-medium text-sm">{user.riot_id}</p>
                  <p className="text-text-secondary text-xs">{user.region?.toUpperCase() || 'No region'}</p>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary text-sm mb-4">Link your Riot ID to track your stats</p>
            )}
            <Link
              href="/profile"
              className="block w-full text-center border border-border-color hover:border-red-highlight text-text-primary py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {user?.riot_id ? 'Update' : 'Link Riot ID'}
            </Link>
          </div>

          {/* Pro Features Card */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-transparent border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold text-text-primary">Pro Features</span>
              <ProBadge />
            </div>
            <ul className="text-text-primary text-sm space-y-1 mb-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited AI coaching
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Advanced predictions
              </li>
            </ul>
            <Link
              href="/pricing"
              className="block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>

          {/* Free Plan Info */}
          <div className="bg-card-bg border border-border-color rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Your Plan</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-bg-color rounded-lg">
                <p className="text-xl font-bold text-text-primary">5</p>
                <p className="text-text-secondary text-xs">Matches</p>
              </div>
              <div className="text-center p-3 bg-bg-color rounded-lg">
                <p className="text-xl font-bold text-text-primary">5/day</p>
                <p className="text-text-secondary text-xs">AI chats</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
