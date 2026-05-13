'use client';
import { useState, useEffect } from 'react';
import LeaderboardEntry from '../components/LeaderboardEntry';
import CodeRain from '../components/CodeRain';

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
      const resp = await fetch(`${API_URL}/leaderboard/${TOURNAMENT_ID}`);
      const data = await resp.json();
      setEntries(data.leaderboard || []);
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
      <CodeRain />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl matrix-text font-bold tracking-wider glitch">LEADERBOARD</h1>
          <p className="text-xs text-[#4D804D] font-mono mt-1">TOURNAMENT #{TOURNAMENT_ID}</p>
        </div>

        {/* Search */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH ADDRESS..."
          className="w-full px-4 py-2 rounded bg-[#0A0A0A] border border-[#1A3A1A] text-sm text-[#B3FFB3] font-mono focus:border-[#00FF41] focus:outline-none placeholder-[#4D804D]"
        />

        {/* Refresh */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-[#4D804D]">
            {filtered.length} PLAYER{filtered.length !== 1 ? 'S' : ''}
          </span>
          <button onClick={load} className="text-xs font-mono text-[#00FF41] hover:underline">
            {loading ? 'LOADING...' : 'REFRESH'}
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <div className="matrix-spinner" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded border border-[#FF1A40] bg-[#1A0A0A] text-sm font-mono text-[#FF1A40] text-center">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm font-mono text-[#4D804D]">
              {search ? 'NO MATCHES FOUND' : 'NO PLAYERS YET'}
            </p>
            {!search && (
              <p className="text-xs text-[#4D804D] mt-2">Be the first to enter the tournament!</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <LeaderboardEntry key={entry.player} entry={entry} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
