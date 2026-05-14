'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from './contract';
import TournamentBar from '@/components/TournamentBar';
import WalletButton from '@/components/WalletButton';
import HudFrame from '@/components/HudFrame';
import LeaderboardEntry from '@/components/LeaderboardEntry';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOURNAMENT_ID = 0;
const BASE_SEPOLIA_CHAIN_ID = 84532;

interface LeaderboardEntryType {
  player: string; score: number; captain_index: number;
  picks: { symbol: string; direction: string }[];
}

export default function Arena() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryType[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [benchmark, setBenchmark] = useState('BTC');
  const [message, setMessage] = useState('');

  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID;
  const connect = (acc: string, chId: number, prov: ethers.BrowserProvider) => {
    setAccount(acc); setChainId(chId); setProvider(prov); setMessage('');
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
    if (!provider || !isCorrectChain) { setTournament(null); return; }
    setLoadingContract(true);
    const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, provider);
    c.getTournament(TOURNAMENT_ID).then((t: any) => {
      setTournament({
        entryFee: ethers.formatEther(t[0]),
        draftDeadline: new Date(Number(t[1]) * 1000),
        endTime: new Date(Number(t[2]) * 1000),
        totalPool: ethers.formatEther(t[3]),
        playerCount: Number(t[4]),
        finalized: t[5],
      });
      setLoadingContract(false);
    }).catch(() => { setLoadingContract(false); });
  }, [provider, isCorrectChain]);

  useEffect(() => {
    fetch(`${API_URL}/leaderboard/${TOURNAMENT_ID}`).then(r => r.json())
      .then(d => setLeaderboard(d.leaderboard || [])).catch(() => {});
  }, [account]);

  const btcPrice = prices[benchmark] || 0;

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3 py-6 animate-fade-in-up">
          <h1 className="text-4xl sm:text-6xl font-bold matrix-text glitch tracking-[0.15em]" data-text="ALTCOIN_FANTASY">
            ALTCOIN_FANTASY
          </h1>
          <p className="text-sm text-[#4D754D] font-mono tracking-[0.2em] uppercase">
            <span className="text-[#00FF41]">▸</span> DRAFT ALTS <span className="text-[#2A3A2A]">//</span> BEAT {benchmark} <span className="text-[#2A3A2A]">//</span> CLAIM ETH <span className="text-[#00FF41]">◂</span>
          </p>
        </div>

        {/* Wallet */}
        <div className="flex justify-center">
          <WalletButton account={account} chainId={chainId} provider={provider} onConnect={connect} onError={setMessage} />
        </div>

        {message && (
          <div className="p-3 rounded border border-[#FF1A40] bg-[#1A0A0A] text-sm font-mono text-[#FF1A40] text-center">
            {message}<button onClick={() => setMessage('')} className="ml-3 text-[#4D754D]">✕</button>
          </div>
        )}

        {/* BTC Ticker */}
        {btcPrice > 0 && (
          <HudFrame variant="gold" title="BENCHMARK: BTC/USDT" subtitle="LIVE" glowing>
            <div className="text-center">
              <span className="text-3xl font-bold font-mono text-[#FFD700] ticker-up">
                ${btcPrice.toLocaleString()}
              </span>
            </div>
          </HudFrame>
        )}

        {/* Tournament Bar */}
        {tournament && (
          <TournamentBar totalPool={tournament.totalPool} playerCount={tournament.playerCount}
            draftDeadline={tournament.draftDeadline} endTime={tournament.endTime} finalized={tournament.finalized} />
        )}

        {/* CTA */}
        <div className="text-center space-y-3">
          <Link href="/play" className="inline-block">
            <span className="btn-neon px-10 py-3.5 text-base font-mono tracking-[0.2em]">ENTER TOURNAMENT</span>
          </Link>
          <p className="text-[10px] text-[#4D754D] font-mono">0.001 ETH • 3 PICKS • 1 CAPTAIN</p>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <HudFrame variant="green" title="LEADERBOARD" subtitle={`TOP ${Math.min(5, leaderboard.length)}`}>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((e, i) => <LeaderboardEntry key={e.player} entry={e} rank={i+1} />)}
            </div>
            <div className="text-center mt-3">
              <Link href="/leaderboard" className="text-[10px] font-mono text-[#00FF41] hover:text-[#33FF66] transition-colors">
                [ VIEW FULL LEADERBOARD → ]
              </Link>
            </div>
          </HudFrame>
        )}

        {/* Status */}
        {!tournament && (
          <div className="text-center py-10">
            {!account ? (
              <HudFrame variant="cyan" title="SYSTEM STATUS">
                <p className="text-sm font-mono text-[#00E5FF]">◈ CONNECT WALLET TO BEGIN</p>
                <p className="text-[10px] text-[#004D5A] font-mono mt-1">Base Sepolia Testnet</p>
              </HudFrame>
            ) : !isCorrectChain ? (
              <div className="p-6 rounded border border-[#FF1A40] bg-[#1A0A0A] text-sm font-mono text-[#FF1A40] text-center animate-pulse">
                ⚠ SWITCH TO BASE SEPOLIA NETWORK
              </div>
            ) : loadingContract ? (
              <div className="text-center">
                <div className="matrix-spinner mx-auto mb-4 w-8 h-8" />
                <p className="text-sm font-mono text-[#4D754D]">LOADING TOURNAMENT...</p>
              </div>
            ) : (
              <p className="text-sm font-mono text-[#4D754D]">NO ACTIVE TOURNAMENT</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
