'use client';

interface PlayerSelectorProps {
  players: string[];
  selectedPlayer: string;
  onPlayerChange: (playerId: string) => void;
  onLoadStats: () => void;
  loading: boolean;
}

export default function PlayerSelector({
  players,
  selectedPlayer,
  onPlayerChange,
  onLoadStats,
  loading
}: PlayerSelectorProps) {
  return (
    <div className="bg-card-bg p-5 rounded-xl mb-5 flex gap-4 items-center flex-wrap border-2 border-border-color">
      <label htmlFor="playerSelect" className="font-semibold text-text-secondary">
        Select Player:
      </label>
      <select
        id="playerSelect"
        value={selectedPlayer}
        onChange={(e) => onPlayerChange(e.target.value)}
        className="flex-1 min-w-[200px] p-2.5 px-4 bg-bg-color border-2 border-border-color rounded-lg text-text-primary text-base cursor-pointer focus:outline-none focus:border-red-highlight"
      >
        <option value="">Select a player...</option>
        {players.map((playerId) => (
          <option key={playerId} value={playerId}>
            {playerId.substring(0, 20)}...
          </option>
        ))}
      </select>
      <button
        onClick={onLoadStats}
        disabled={loading || !selectedPlayer}
        className="px-8 py-2.5 bg-red-highlight border-none rounded-lg text-white font-semibold text-base cursor-pointer transition-all duration-200 hover:translate-y-[-2px] hover:bg-red-highlight-light hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? 'Loading...' : 'Load Stats'}
      </button>
    </div>
  );
}
