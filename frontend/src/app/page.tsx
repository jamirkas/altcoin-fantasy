'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from './contract';
import CodeRain from '@/components/CodeRain';
import TournamentBar from '@/components/TournamentBar';
import WalletButton from '@/components/WalletButton';
import LeaderboardEntry from '@/components/LeaderboardEntry';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOURNAMENT_ID = 0;

interface LeaderboardEntryType {
  player: string; score: number; captain_index: number;
  picks: { symbol: string; direction: string }[];
}

export default function Arena() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryType[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [benchmark, setBenchmark] = useState('BTC');
  const [myDraft, setMyDraft] = useState<any>(null);
  const [message, setMessage] = useState('');

  const connect = (acc: string, prov: ethers.BrowserProvider) => {
    setAccount(acc); setProvider(prov); setMessage('');
  };

  useEffect(() => {
    fetch(`${API_URL}/tokens`).then(r => r.json()).then(d => {
      setBenchmark(d.benchmark); setPrices(d.prices);
    }).catch(() => {});
    const interval = setInterval(() => {
      fetch(`${API_URL}/tokens`).then(r => r.json()).then(d => setPrices(d.prices)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!provider) return;
    const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, provider);
    c.getTournament(TOURNAMENT_ID).then((t: any) => setTournament({
      entryFee: ethers.formatEther(t[0]),
      draftDeadline: new Date(Number(t[1]) * 1000),
      endTime: new Date(Number(t[2]) * 1000),
      totalPool: ethers.formatEther(t[3]),
      playerCount: Number(t[4]),
      finalized: t[5],
    })).catch(() => {});
  }, [provider]);

  useEffect(() => {
    fetch(`${API_URL}/leaderboard/${TOURNAMENT_ID}`).then(r => r.json()).then(d => setLeaderboard(d.leaderboard || [])).catch(() => {});
  }, [account]);

  const btcPrice = prices[benchmark] || 0;

  return (
    <div className="relative min-h-screen">
      <CodeRain />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2 py-4">
          <h1 className="text-3xl sm:text-5xl font-bold matrix-text glitch tracking-widest">ALTCOIN_FANTASY</h1>
          <p className="text-sm text-[#4D804D] font-mono">DRAFT ALTS • BEAT {benchmark} • CLAIM ETH</p>
        </div>

        <div className="flex justify-center">
          <WalletButton account={account} provider={provider} onConnect={connect} onError={setMessage} />
        </div>

        {message && (
          <div className="p-3 rounded border border-[#FF1A40] bg-[#1A0A0A] text-sm font-mono text-[#FF1A40] text-center">
            {message}<button onClick={() => setMessage('')} className="ml-3 text-[#4D804D]">✕</button>
          </div>
        )}

        {btcPrice > 0 && (
          <div className="text-center font-mono text-sm">
            <span className="text-[#4D804D]">{benchmark}: </span>
            <span className="text-[#FFD700] font-bold">${btcPrice.toLocaleString()}</span>
          </div>
        )}

        {tournament && (
          <TournamentBar totalPool={tournament.totalPool} playerCount={tournament.playerCount}
            draftDeadline={tournament.draftDeadline} endTime={tournament.endTime} finalized={tournament.finalized} />
        )}

        <div className="text-center space-y-3">
          <Link href="/play" className="inline-block">
            <span className="btn-neon px-8 py-3 text-base font-mono tracking-widest">ENTER TOURNAMENT</span>
          </Link>
          <p className="text-[10px] text-[#4D804D] font-mono">0.001 ETH • 3 PICKS • 1 CAPTAIN</p>
        </div>

        {leaderboard.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-mono text-[#4D804D] uppercase tracking-wider">▸ TOP {Math.min(5, leaderboard.length)}</h2>
              <Link href="/leaderboard" className="text-xs font-mono text-[#00FF41] hover:underline">VIEW ALL →</Link>
            </div>
            {leaderboard.slice(0, 5).map((e, i) => <LeaderboardEntry key={e.player} entry={e} rank={i+1} />)}
          </div>
        )}

        {!tournament && (
          <div className="text-center py-10">
            <div className="matrix-spinner mx-auto mb-4" />
            <p className="text-sm font-mono text-[#4D804D]">CONNECTING TO BASE SEPOLIA...</p>
          </div>
        )}
      </div>
    </div>
  );
}
