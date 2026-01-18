'use client';

import { StabilityData } from '@/lib/api';

interface StabilityCardProps {
  data: StabilityData | null;
  isEmpty: boolean;
}

export default function StabilityCard({ data, isEmpty }: StabilityCardProps) {
  const isEmptyState = isEmpty || !data || data.empty || data.match_count === 0;

  return (
    <div className="bg-bg-color p-6 rounded-xl mb-8">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
        <div>
          <div className="text-text-secondary text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
            Stability Score
            <span className="group relative inline-flex items-center cursor-help">
              <span className="w-[18px] h-[18px] rounded-full bg-border-color-light text-text-secondary flex items-center justify-center text-xs font-semibold transition-colors group-hover:bg-red-highlight group-hover:text-white">
                ?
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-2 bg-card-bg-light border border-border-color rounded-lg p-3 min-w-[280px] max-w-[320px] text-sm leading-relaxed text-text-primary opacity-0 pointer-events-none transition-all group-hover:opacity-100 group-hover:-translate-y-1 z-50 shadow-lg mb-2">
                <strong>Stability Score</strong><br />
                Measures how consistent your headshot rate is across matches.<br /><br />
                <strong>Scale (0-100):</strong><br />
                • 71-100: Stable - Consistent performance<br />
                • 31-70: Inconsistent - Moderate variation<br />
                • 0-30: Unstable - High variation
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-card-bg-light" />
              </div>
            </span>
          </div>
          <div 
            className={`text-5xl font-bold ${isEmptyState ? 'text-text-muted' : ''}`}
            style={{ color: isEmptyState ? '#666666' : data?.color }}
          >
            {isEmptyState ? '—' : data?.score}
          </div>
        </div>
        <div 
          className="px-4 py-2 rounded-full text-white font-semibold"
          style={{ backgroundColor: isEmptyState ? '#666666' : data?.color }}
        >
          {isEmptyState ? 'No Data' : data?.label}
        </div>
      </div>

      <div className="text-text-secondary mb-6">
        {isEmptyState ? 'No matches played during this time frame.' : data?.description}
      </div>

      <div className="flex gap-8 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary text-sm">Volatility:</span>
          <span className="text-text-primary font-semibold">
            {isEmptyState ? '—' : `${data?.volatility}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary text-sm">Average HS Rate:</span>
          <span className="text-text-primary font-semibold">
            {isEmptyState ? '—' : `${data?.avg_hs_rate || data?.current_hs_rate}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary text-sm">Matches Analyzed:</span>
          <span className="text-text-primary font-semibold">
            {isEmptyState ? '0' : data?.match_count}
          </span>
        </div>
      </div>
    </div>
  );
}
