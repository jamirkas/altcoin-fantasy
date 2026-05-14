'use client';
import { useState, useEffect } from 'react';
import LeaderboardEntry from '@/components/LeaderboardEntry';
import HudFrame from '@/components/HudFrame';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOURNAMENT_ID = 0;

interface Entry {
  player: string; score: number; captain_index: number;
  picks: { symbol: string; direction: string }[];
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/leaderboard/${TOURNAMENT_ID}`);
      const d = await r.json();
      setEntries(d.leaderboard || []);
      setError('');
    } catch { setError('API offline'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = search
    ? entries.filter(e => e.player.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl matrix-text font-bold tracking-wider glitch" data-text="LEADERBOARD">LEADERBOARD</h1>
          <p className="text-xs text-[#4D754D] font-mono mt-1.5 tracking-[0.15em]">TOURNAMENT #{TOURNAMENT_ID}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH ADDRESS..."
            className="w-full px-4 py-2.5 rounded bg-[#0A0A0F] border border-[#1A2A1A] text-sm text-[#C0FFC0] font-mono focus:border-[#00FF41] focus:outline-none focus:shadow-[0_0_15px_rgba(0,255,65,0.1)] placeholder-[#2A3A2A] transition-all"
          />
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-mono text-[#4D754D] tracking-wider">{filtered.length} PLAYER{filtered.length!==1?'S':''}</span>
          <button onClick={load} className="text-[10px] font-mono text-[#00FF41] hover:text-[#33FF66] transition-colors tracking-wider">
            {loading ? 'LOADING...' : '[ REFRESH ]'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="matrix-spinner w-8 h-8" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded border border-[#FF1A40] bg-[#1A0A0A] text-sm font-mono text-[#FF1A40] text-center">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <HudFrame variant="green" title={search ? 'NO MATCHES' : 'NO PLAYERS YET'}>
            <p className="text-center text-sm font-mono text-[#4D754D]">
              {search ? 'No players match your search' : 'Be the first to enter!'}
            </p>
          </HudFrame>
        )}

        {/* Leaderboard */}
        {!loading && filtered.length > 0 && (
          <HudFrame variant="green" title="RANKINGS" subtitle={`${filtered.length} PLAYERS`}>
            <div className="space-y-1.5">
              {filtered.map((e, i) => (
                <LeaderboardEntry key={e.player} entry={e} rank={i+1} />
              ))}
            </div>
          </HudFrame>
        )}
      </div>
    </div>
  );
}
