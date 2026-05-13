'use client';
import { useState, useEffect } from 'react';

interface Props {
  totalPool: string;
  playerCount: number;
  draftDeadline: Date;
  endTime: Date;
  finalized: boolean;
}

export default function TournamentBar({ totalPool, playerCount, draftDeadline, endTime, finalized }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const draftRemaining = Math.max(0, draftDeadline.getTime() - now);
  const endRemaining = Math.max(0, endTime.getTime() - now);
  const totalDuration = endTime.getTime() - draftDeadline.getTime();
  const elapsed = totalDuration > 0 ? ((totalDuration - endRemaining) / totalDuration) * 100 : 0;

  const days = Math.floor(draftRemaining / 86400000);
  const hours = Math.floor((draftRemaining % 86400000) / 3600000);
  const mins = Math.floor((draftRemaining % 3600000) / 60000);

  return (
    <div className="p-4 rounded border border-[#1A3A1A] bg-[#0D0D0D] neon-box">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-[10px] text-[#4D804D] font-mono uppercase tracking-wider">Prize Pool</div>
          <div className="text-lg font-mono text-[#00FF41] font-bold ticker-up">{totalPool} ETH</div>
        </div>
        <div>
          <div className="text-[10px] text-[#4D804D] font-mono uppercase tracking-wider">Players</div>
          <div className="text-lg font-mono font-bold">{playerCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#4D804D] font-mono uppercase tracking-wider">Draft Closes</div>
          <div className="text-sm font-mono text-[#FF8C00]">
            {draftRemaining <= 0 ? 'CLOSED' : `${days}d ${hours}h ${mins}m`}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#4D804D] font-mono uppercase tracking-wider">Status</div>
          <div className="text-sm font-mono">
            {finalized ? (
              <span className="text-[#00FF41]">FINALIZED</span>
            ) : draftRemaining <= 0 ? (
              <span className="text-[#FF8C00]">LIVE</span>
            ) : (
              <span className="text-[#4D804D]">DRAFTING</span>
            )}
          </div>
        </div>
      </div>
      {/* Progress bar */}
      {!finalized && draftRemaining <= 0 && (
        <div className="mt-3 progress-bar">
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, elapsed)}%` }} />
        </div>
      )}
    </div>
  );
}
