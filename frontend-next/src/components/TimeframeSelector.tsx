'use client';

interface TimeframeSelectorProps {
  currentTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

const timeframes = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'season', label: 'Season' },
  { id: 'all_time', label: 'All Time' },
];

export default function TimeframeSelector({ currentTimeframe, onTimeframeChange }: TimeframeSelectorProps) {
  return (
    <div className="my-6">
      <div className="flex flex-wrap justify-between gap-2 bg-bg-color p-1 rounded-xl">
        {timeframes.map((tf) => (
          <button
            key={tf.id}
            onClick={() => onTimeframeChange(tf.id)}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 cursor-pointer
              ${currentTimeframe === tf.id
                ? 'bg-red-highlight text-white shadow-md'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-card-bg-light'
              }
            `}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}
