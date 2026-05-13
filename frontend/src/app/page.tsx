'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from './contract';

// ─── Config ───
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOURNAMENT_ID = 0;

// ─── Types ───
interface Token {
  symbol: string;
  price: number;
  direction: 'LONG' | 'SHORT' | null;
}

interface LeaderboardEntry {
  player: string;
  score: number;
  picks: { symbol: string; direction: string }[];
  captain_index: number;
}

// ─── Main Page ───
export default function Home() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contractAddress, setContractAddress] = useState<string>(DEPLOYED_ADDRESS);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Map<string, 'LONG' | 'SHORT'>>(new Map());
  const [captainIndex, setCaptainIndex] = useState<number>(0);
  const [referrer, setReferrer] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [benchmark, setBenchmark] = useState('BTC');
  const [captainMultiplier, setCaptainMultiplier] = useState(2);

  // ─── Connect Wallet ───
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setMessage('Install MetaMask or Rabby');
      return;
    }
    try {
      const prov = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await prov.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
      setProvider(prov);
      setMessage('');
    } catch (e: any) {
      setMessage('Wallet connection failed');
    }
  };

  // ─── Load Tokens & Prices ───
  const loadTokens = async () => {
    try {
      const resp = await fetch(`${API_URL}/tokens`);
      const data = await resp.json();
      setBenchmark(data.benchmark);
      setPrices(data.prices);
      if (data.captain_multiplier) setCaptainMultiplier(data.captain_multiplier);
      setTokens(
        data.tokens.map((sym: string) => ({
          symbol: sym,
          price: data.prices[sym] || 0,
          direction: selectedTokens.get(sym) || null,
        }))
      );
    } catch (e) {
      // API not reachable — keep stale data
    }
  };

  useEffect(() => {
    loadTokens();
    const interval = setInterval(loadTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Load Tournament ───
  useEffect(() => {
    if (!provider || !contractAddress) return;
    const loadTournament = async () => {
      try {
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
        const t = await contract.getTournament(TOURNAMENT_ID);
        setTournament({
          entryFee: ethers.formatEther(t[0]),
          draftDeadline: new Date(Number(t[1]) * 1000),
          endTime: new Date(Number(t[2]) * 1000),
          totalPool: ethers.formatEther(t[3]),
          playerCount: Number(t[4]),
          finalized: t[5],
          merkleRoot: t[6],
        });
      } catch (e) {}
    };
    loadTournament();
  }, [provider, contractAddress]);

  // ─── Load Leaderboard ───
  const loadLeaderboard = async () => {
    try {
      const resp = await fetch(`${API_URL}/leaderboard/${TOURNAMENT_ID}`);
      const data = await resp.json();
      setLeaderboard(data.leaderboard || []);
    } catch (e) {}
  };

  // ─── Toggle Token Direction ───
  const toggleToken = (symbol: string, direction: 'LONG' | 'SHORT') => {
    const next = new Map(selectedTokens);
    if (next.get(symbol) === direction) {
      next.delete(symbol);
      // If removed token was captain, reset captain to 0
      const remaining = Array.from(next.keys());
      if (remaining.length > 0 && !next.has(getSelectedOrder()[captainIndex] || '')) {
        setCaptainIndex(0);
      }
    } else if (next.size < 3 || next.has(symbol)) {
      next.set(symbol, direction);
    }
    setSelectedTokens(next);
  };

  // ─── Get selected tokens in fixed order ───
  const getSelectedOrder = (): string[] => {
    return Array.from(selectedTokens.keys());
  };

  // ─── Set Captain by clicking on selected token ───
  const makeCaptain = (symbol: string) => {
    const order = getSelectedOrder();
    const idx = order.indexOf(symbol);
    if (idx >= 0) setCaptainIndex(idx);
  };

  // ─── Submit Draft ───
  const submitDraft = async () => {
    if (!account) return setMessage('Connect wallet first');
    const order = getSelectedOrder();
    const picks = order.map((symbol) => ({
      symbol,
      direction: selectedTokens.get(symbol)!,
    }));
    if (picks.length !== 3) return setMessage('Select exactly 3 tokens');

    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: TOURNAMENT_ID,
          player: account,
          picks,
          captain_index: captainIndex,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setMessage(`Draft submitted! Captain: ${order[data.captain_index]} (${captainMultiplier}x boost)`);
      } else {
        const err = await resp.json();
        setMessage(err.detail || 'Error');
      }
    } catch (e) {
      setMessage('API error');
    }
    setLoading(false);
  };

  // ─── Enter Tournament (on-chain) ───
  const enterTournament = async () => {
    if (!provider || !account || !contractAddress) return setMessage('Connect wallet first');
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      const entryFee = tournament?.entryFee || '0.001';
      
      let tx;
      if (referrer && ethers.isAddress(referrer)) {
        tx = await contract.enterWithReferral(TOURNAMENT_ID, referrer, captainIndex, {
          value: ethers.parseEther(entryFee),
          gasLimit: 150000,
        });
      } else {
        tx = await contract.enter(TOURNAMENT_ID, {
          value: ethers.parseEther(entryFee),
          gasLimit: 150000,
        });
      }
      await tx.wait();
      setMessage('Entered! Now submit your draft.');
      loadLeaderboard();
    } catch (e: any) {
      setMessage(e.reason || e.message || 'Transaction failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-orange-400">🏆 Altcoin Fantasy</h1>
          <p className="text-xs text-gray-500">Beat the Benchmark — Week 1</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Contract address"
            className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 w-48 font-mono"
          />
          <button
            onClick={connectWallet}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              account
                ? 'bg-green-900 text-green-300 border border-green-700'
                : 'bg-orange-600 text-white hover:bg-orange-500'
            }`}
          >
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </header>

      {message && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300">
          {message}
          <button onClick={() => setMessage('')} className="ml-3 text-gray-500">✕</button>
        </div>
      )}

      {/* Tournament info bar */}
      {tournament && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm flex flex-wrap gap-4">
          <span>🎟 Pool: <strong className="text-orange-400">{tournament.totalPool} ETH</strong></span>
          <span>👥 Players: <strong>{tournament.playerCount}</strong></span>
          <span>⏳ Draft: <strong>{tournament.draftDeadline.toLocaleString()}</strong></span>
          <span>🏁 Ends: <strong>{tournament.endTime.toLocaleString()}</strong></span>
          {tournament.finalized && <span className="text-green-400">✅ Finalized</span>}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto">
        {/* Left: Token Selection */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Pick Your Team</h2>
            <span className="text-sm text-gray-500">
              {selectedTokens.size} / 3 selected
            </span>
          </div>

          {/* Captain selection bar */}
          {selectedTokens.size > 0 && (
            <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm">
              <span className="text-gray-400">👑 Captain ({captainMultiplier}x boost): </span>
              <span className="text-yellow-400 font-bold">
                {getSelectedOrder()[captainIndex] || '...'}
              </span>
              <span className="text-xs text-gray-600 ml-2">
                (click 👑 on selected token to change)
              </span>
            </div>
          )}

          {/* Benchmark display */}
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm">
            📊 Benchmark: <strong className="text-orange-400">{benchmark}</strong> — ${prices[benchmark]?.toLocaleString() || '...'}
          </div>

          {/* Token grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {tokens.filter(t => t.symbol !== benchmark).map((token) => {
              const isLong = selectedTokens.get(token.symbol) === 'LONG';
              const isShort = selectedTokens.get(token.symbol) === 'SHORT';
              const isSelected = isLong || isShort;
              const order = getSelectedOrder();
              const tokenIdx = order.indexOf(token.symbol);
              const isCaptain = isSelected && tokenIdx === captainIndex;
              return (
                <div
                  key={token.symbol}
                  className={`p-3 rounded-lg border transition-all relative ${
                    isCaptain
                      ? 'border-yellow-500 bg-yellow-900/40 ring-1 ring-yellow-500/50'
                      : isLong
                      ? 'border-green-500 bg-green-900/30'
                      : isShort
                      ? 'border-red-500 bg-red-900/30'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  {/* Captain badge */}
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); makeCaptain(token.symbol); }}
                      className={`absolute top-1 right-1 text-sm w-6 h-6 rounded-full flex items-center justify-center transition ${
                        isCaptain
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-700 text-gray-400 hover:bg-yellow-600 hover:text-white'
                      }`}
                      title={isCaptain ? 'Captain (click to change)' : 'Make captain'}
                    >
                      👑
                    </button>
                  )}
                  <div className="flex justify-between items-center mb-2 pr-6">
                    <span className="font-bold text-sm">{token.symbol}</span>
                    <span className="text-xs text-gray-400">${token.price.toFixed(token.price < 1 ? 4 : 2)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleToken(token.symbol, 'LONG')}
                      className={`flex-1 px-2 py-1 text-xs rounded font-medium ${
                        isLong ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      onClick={() => toggleToken(token.symbol, 'SHORT')}
                      className={`flex-1 px-2 py-1 text-xs rounded font-medium ${
                        isShort ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Referral input */}
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800">
            <label className="text-xs text-gray-500 block mb-1">
              🔗 Referral address (optional — they get {15}% of your entry)
            </label>
            <input
              type="text"
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={enterTournament}
              disabled={loading || !account || !contractAddress}
              className="px-6 py-2.5 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-500 disabled:opacity-50 transition"
            >
              🎟 Enter (0.001 ETH)
            </button>
            <button
              onClick={submitDraft}
              disabled={loading || !account || selectedTokens.size < 3}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 transition"
            >
              📝 Submit Draft
            </button>
          </div>
        </div>

        {/* Right: Leaderboard */}
        <div className="lg:w-96 space-y-4">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <button
            onClick={loadLeaderboard}
            className="text-sm text-orange-400 hover:underline"
          >
            Refresh
          </button>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {leaderboard.length === 0 && (
              <p className="text-sm text-gray-600">No players yet. Enter the tournament!</p>
            )}
            {leaderboard.map((entry, i) => (
              <div
                key={entry.player}
                className={`p-3 rounded-lg border ${
                  i === 0 ? 'border-yellow-600 bg-yellow-900/20' : 'border-gray-800 bg-gray-900'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono">
                    {i + 1}. {entry.player.slice(0, 6)}...
                  </span>
                  <span className={`font-bold ${entry.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.score > 0 ? '+' : ''}{entry.score.toFixed(2)}%
                  </span>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {entry.picks.map((p, pi) => (
                    <span
                      key={p.symbol}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        pi === entry.captain_index
                          ? 'bg-yellow-900 text-yellow-400 ring-1 ring-yellow-500/50'
                          : p.direction === 'LONG'
                          ? 'bg-green-900 text-green-400'
                          : 'bg-red-900 text-red-400'
                      }`}
                    >
                      {pi === entry.captain_index ? '👑' : ''}{p.direction[0]}{p.symbol}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
