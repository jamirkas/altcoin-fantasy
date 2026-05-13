interface Entry {
  player: string;
  score: number;
  picks: { symbol: string; direction: string }[];
  captain_index: number;
}

interface Props {
  entry: Entry;
  rank: number;
}

export default function LeaderboardEntry({ entry, rank }: Props) {
  const rankColors: Record<number, string> = {
    1: 'border-[#FFD700] bg-[#1A1A0A]/30 neon-box-gold',
    2: 'border-[#C0C0C0] bg-[#1A1A1A]/20',
    3: 'border-[#CD7F32] bg-[#1A0D0A]/20',
  };
  const borderClass = rankColors[rank] || 'border-[#1A3A1A] bg-[#0D0D0D]';

  return (
    <div className={`p-3 rounded border ${borderClass} transition-all`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className={`font-mono font-bold text-sm w-6 ${
            rank === 1 ? 'text-[#FFD700]' : rank <= 3 ? 'text-[#B3FFB3]' : 'text-[#4D804D]'
          }`}>
            {rank}.
          </span>
          <span className="text-sm font-mono text-[#B3FFB3]">
            {entry.player.slice(0, 6)}...{entry.player.slice(-4)}
          </span>
        </div>
        <span className={`font-mono font-bold text-sm ${
          entry.score > 0 ? 'text-[#00FF41]' : entry.score < 0 ? 'text-[#FF1A40]' : 'text-[#4D804D]'
        }`}>
          {entry.score > 0 ? '+' : ''}{entry.score.toFixed(2)}%
        </span>
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {entry.picks.map((p, pi) => (
          <span
            key={p.symbol}
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              pi === entry.captain_index
                ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40'
                : p.direction === 'LONG'
                ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20'
                : 'bg-[#FF1A40]/10 text-[#FF1A40] border border-[#FF1A40]/20'
            }`}
          >
            {pi === entry.captain_index ? '⚡' : ''}{p.direction[0]}{p.symbol}
          </span>
        ))}
      </div>
    </div>
  );
}
