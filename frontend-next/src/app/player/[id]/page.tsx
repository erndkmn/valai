'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, StabilityData, Match } from '@/lib/api';
import TabNavigation from '@/components/TabNavigation';
import TimeframeSelector from '@/components/TimeframeSelector';
import StabilityCard from '@/components/StabilityCard';
import TrendChart from '@/components/TrendChart';
import RecentMatches from '@/components/RecentMatches';
import CopilotChat from '@/components/CopilotChat';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

function PlayerStatsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const playerId = params.id as string;
  const tabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState<string>(tabParam || 'stability');
  const [currentTimeframe, setCurrentTimeframe] = useState<string>('all_time');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [stabilityData, setStabilityData] = useState<StabilityData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam && ['stability', 'positioning', 'prediction', 'copilot'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const loadPlayerStats = useCallback(async () => {
    if (!playerId) {
      setError('No player ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [stability, matchesData] = await Promise.all([
        api.getStability(playerId, currentTimeframe),
        api.getMatches(playerId, 100, currentTimeframe)
      ]);

      const dataIsEmpty = stability.empty || matchesData.empty || matchesData.count === 0;
      
      setStabilityData(stability);
      setMatches(matchesData.matches);
      setIsEmpty(dataIsEmpty);
    } catch (err) {
      setError('Failed to load stats: ' + (err as Error).message);
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }, [playerId, currentTimeframe]);

  useEffect(() => {
    loadPlayerStats();
  }, [loadPlayerStats]);

  const handleTimeframeChange = (timeframe: string) => {
    setCurrentTimeframe(timeframe);
  };

  return (
    <div className="min-h-screen bg-bg-color text-text-primary p-5">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10 py-8">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-br from-red-highlight to-red-highlight-light bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              ValAI
            </h1>
          </Link>
          <p className="text-text-secondary text-xl">Player Statistics for <span className="text-red-highlight font-semibold">{playerId}</span></p>
        </header>

        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-red-highlight transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/20 border-2 border-red-highlight text-red-highlight p-4 rounded-xl mb-5 text-center font-medium">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="inline-block w-8 h-8 border-4 border-red-highlight border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-text-secondary">Loading stats for {playerId}...</p>
          </div>
        )}

        {!loading && !error && (
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
                    playerId={playerId}
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

export default function PlayerStats() {
  return (
    <ProtectedRoute>
      <PlayerStatsContent />
    </ProtectedRoute>
  );
}
