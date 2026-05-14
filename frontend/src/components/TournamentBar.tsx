'use client';
import { useState, useEffect } from 'react';
import HudFrame from '@/components/HudFrame';

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

  const statusVariant = finalized ? 'green' : draftRemaining <= 0 ? 'gold' : 'cyan';

  return (
    <HudFrame variant={statusVariant} title="TOURNAMENT STATUS" subtitle="TOURNAMENT #0" glowing={draftRemaining <= 0 && !finalized}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-[9px] text-[#4D754D] font-mono tracking-[0.15em] uppercase">Prize Pool</div>
          <div className="text-lg font-mono text-[#00FF41] font-bold ticker-up">{totalPool} ETH</div>
        </div>
        <div className="space-y-1">
          <div className="text-[9px] text-[#4D754D] font-mono tracking-[0.15em] uppercase">Players</div>
          <div className="text-lg font-mono font-bold text-[#C0FFC0]">{playerCount}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[9px] text-[#4D754D] font-mono tracking-[0.15em] uppercase">Draft Closes</div>
          <div className="text-sm font-mono text-[#FF8C00] font-bold">
            {draftRemaining <= 0 ? 'CLOSED' : `${days}d ${hours}h ${mins}m`}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[9px] text-[#4D754D] font-mono tracking-[0.15em] uppercase">Status</div>
          <div className="text-sm font-mono font-bold">
            {finalized ? (
              <span className="text-[#00FF41]">◆ FINALIZED</span>
            ) : draftRemaining <= 0 ? (
              <span className="text-[#FFD700] animate-pulse">▶ LIVE</span>
            ) : (
              <span className="text-[#00E5FF]">◈ DRAFTING</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {!finalized && draftRemaining <= 0 && (
        <div className="mt-4 progress-bar">
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, elapsed)}%` }} />
        </div>
      )}
    </HudFrame>
  );
}
