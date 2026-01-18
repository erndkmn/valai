'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, StabilityData, Match } from '@/lib/api';
import PlayerSelector from '@/components/PlayerSelector';
import TabNavigation from '@/components/TabNavigation';
import TimeframeSelector from '@/components/TimeframeSelector';
import StabilityCard from '@/components/StabilityCard';
import TrendChart from '@/components/TrendChart';
import RecentMatches from '@/components/RecentMatches';
import CopilotChat from '@/components/CopilotChat';

export default function Home() {
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('stability');
  const [currentTimeframe, setCurrentTimeframe] = useState<string>('all_time');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState<boolean>(false);
  
  const [stabilityData, setStabilityData] = useState<StabilityData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        const data = await api.getPlayers();
        setPlayers(data.players);
        if (data.players.length > 0) {
          setSelectedPlayer(data.players[0]);
        }
      } catch (err) {
        setError('Failed to load players: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, []);

  const loadPlayerStats = useCallback(async () => {
    if (!selectedPlayer) {
      setError('Please select a player');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [stability, matchesData] = await Promise.all([
        api.getStability(selectedPlayer, currentTimeframe),
        api.getMatches(selectedPlayer, 100, currentTimeframe)
      ]);

      const dataIsEmpty = stability.empty || matchesData.empty || matchesData.count === 0;
      
      setStabilityData(stability);
      setMatches(matchesData.matches);
      setIsEmpty(dataIsEmpty);
      setShowStats(true);
    } catch (err) {
      setError('Failed to load stats: ' + (err as Error).message);
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer, currentTimeframe]);

  useEffect(() => {
    if (showStats && selectedPlayer) {
      loadPlayerStats();
    }
  }, [currentTimeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayerChange = (playerId: string) => {
    setSelectedPlayer(playerId);
    if (playerId) {
      setShowStats(false);
    }
  };

  const handleTimeframeChange = (timeframe: string) => {
    setCurrentTimeframe(timeframe);
  };

  return (
    <div className="min-h-screen bg-bg-color text-text-primary p-5">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10 py-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-br from-red-highlight to-red-highlight-light bg-clip-text text-transparent">
            ValAI
          </h1>
          <p className="text-text-secondary text-xl">Valorant Statistics & Analysis</p>
        </header>

        <PlayerSelector
          players={players}
          selectedPlayer={selectedPlayer}
          onPlayerChange={handlePlayerChange}
          onLoadStats={loadPlayerStats}
          loading={loading}
        />

        {error && (
          <div className="bg-red-500/20 border-2 border-red-highlight text-red-highlight p-4 rounded-xl mb-5 text-center font-medium">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="inline-block w-8 h-8 border-4 border-red-highlight border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-text-secondary">Loading data...</p>
          </div>
        )}

        {showStats && !loading && (
          <>
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="bg-card-bg rounded-b-xl rounded-tr-xl border-2 border-border-color">
              {activeTab === 'stability' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-text-primary mb-6">Stability Analysis</h2>
                  <StabilityCard data={stabilityData} isEmpty={isEmpty} />
                  <TimeframeSelector currentTimeframe={currentTimeframe} onTimeframeChange={handleTimeframeChange} />
                  <TrendChart trendData={stabilityData?.trend || null} isEmpty={isEmpty} />
                  <RecentMatches matches={matches} isEmpty={isEmpty} />
                </div>
              )}

              {activeTab === 'positioning' && (
                <div className="p-16 text-center">
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Positioning Analysis</h2>
                  <p className="text-text-tertiary text-lg">Coming soon...</p>
                </div>
              )}

              {activeTab === 'prediction' && (
                <div className="p-16 text-center">
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Prediction Analysis</h2>
                  <p className="text-text-tertiary text-lg">Coming soon...</p>
                </div>
              )}

              {activeTab === 'copilot' && (
                <div className="p-4">
                  <CopilotChat 
                    playerId={selectedPlayer}
                    stabilityData={stabilityData}
                    recentMatches={matches}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
