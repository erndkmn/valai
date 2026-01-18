'use client';

import { Match } from '@/lib/api';

interface RecentMatchesProps {
  matches: Match[];
  isEmpty: boolean;
}

export default function RecentMatches({ matches, isEmpty }: RecentMatchesProps) {
  if (isEmpty || matches.length === 0) {
    return (
      <div className="bg-card-bg p-8 rounded-xl border-2 border-border-color mt-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Matches</h2>
        <div className="text-center py-8">
          <p className="text-text-muted text-lg">No matches played during this time frame</p>
          <p className="text-text-tertiary mt-2">Try selecting a different time period above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg p-8 rounded-xl border-2 border-border-color mt-8">
      <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Matches</h2>
      <div className="space-y-3">
        {matches.map((match, index) => (
          <div
            key={index}
            className="bg-bg-color p-4 rounded-xl flex justify-between items-center flex-wrap gap-4 border-2 border-transparent hover:border-red-highlight transition-all duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="text-text-tertiary text-xs uppercase tracking-wider">
                Match {matches.length - index}
              </div>
              <div className="text-text-primary font-semibold">
                {new Date(match.match_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-text-tertiary text-xs uppercase tracking-wider">HS Rate</div>
              <div className="text-red-highlight font-bold text-lg">
                {match.hs_rate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-text-tertiary text-xs uppercase tracking-wider">Kills</div>
              <div className="text-text-primary font-semibold">{match.total_kills}</div>
            </div>
            <div>
              <div className="text-text-tertiary text-xs uppercase tracking-wider">Total Shots</div>
              <div className="text-text-primary font-semibold">{match.total_shots}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
