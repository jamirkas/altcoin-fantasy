'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// ─── Contract ABI (minimal for MVP) ───
const CONTRACT_ABI = [
  "function enter(uint256 _tournamentId) external payable",
  "function claim(uint256 _tournamentId, uint256 _amount, bytes32[] calldata _proof) external",
  "function getTournament(uint256 _id) external view returns (uint256,uint256,uint256,uint256,uint256,bool,bytes32)",
  "function tournamentCount() external view returns (uint256)",
  "event Entered(uint256 indexed tournamentId, address indexed player, uint256 fee, uint256 playerCount)",
  "event ResultsPosted(uint256 indexed tournamentId, bytes32 merkleRoot)",
  "event Claimed(uint256 indexed tournamentId, address indexed player, uint256 amount)",
];

// ─── Config ───
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Deploy first
const API_URL = 'https://55f32ab36f36b0.lhr.life';
const TOURNAMENT_ID = 1;

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
}

// ─── Main Page ───
export default function Home() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<Map<string, 'LONG' | 'SHORT'>>(new Map());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [benchmark, setBenchmark] = useState('BTC');

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
      setTokens(
        data.tokens.map((sym: string) => ({
          symbol: sym,
          price: data.prices[sym] || 0,
          direction: selectedTokens.get(sym) || null,
        }))
      );
    } catch (e) {
      setMessage('API not reachable. Start backend: python main.py');
    }
  };

  useEffect(() => {
    loadTokens();
    const interval = setInterval(loadTokens, 30000);
    return () => clearInterval(interval);
  }, []);

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
      next.delete(symbol); // deselect
    } else {
      next.set(symbol, direction);
    }
    setSelectedTokens(next);
  };

  // ─── Submit Draft ───
  const submitDraft = async () => {
    if (!account) return setMessage('Connect wallet first');
    const picks = Array.from(selectedTokens.entries()).map(([symbol, direction]) => ({
      symbol,
      direction,
    }));
    if (picks.length < 3) return setMessage('Pick at least 3 tokens');

    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: TOURNAMENT_ID,
          player: account,
          picks,
        }),
      });
      if (resp.ok) {
        setMessage('Draft submitted! Check leaderboard after tournament ends.');
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
    if (!provider || !account) return setMessage('Connect wallet first');
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.enter(TOURNAMENT_ID, {
        value: ethers.parseEther('0.001'), // 0.001 ETH entry fee
      });
      await tx.wait();
      setMessage('Entered tournament! Now submit your draft.');
      loadLeaderboard();
    } catch (e: any) {
      setMessage(e.reason || 'Transaction failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-orange-400">🏆 Altcoin Fantasy</h1>
          <p className="text-xs text-gray-500">Beat the Benchmark — Week 1</p>
        </div>
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
      </header>

      {message && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300">
          {message}
          <button onClick={() => setMessage('')} className="ml-3 text-gray-500">✕</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto">
        {/* Left: Token Selection */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Pick Your Team</h2>
            <span className="text-sm text-gray-500">
              {selectedTokens.size} / 10 selected
            </span>
          </div>

          {/* Benchmark display */}
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm">
            📊 Benchmark: <strong className="text-orange-400">{benchmark}</strong> — ${prices[benchmark]?.toLocaleString() || '...'}
          </div>

          {/* Token grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {tokens.filter(t => t.symbol !== benchmark).map((token) => {
              const isLong = selectedTokens.get(token.symbol) === 'LONG';
              const isShort = selectedTokens.get(token.symbol) === 'SHORT';
              return (
                <div
                  key={token.symbol}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isLong
                      ? 'border-green-500 bg-green-900/30'
                      : isShort
                      ? 'border-red-500 bg-red-900/30'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={enterTournament}
              disabled={loading || !account}
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
                  {entry.picks.map((p) => (
                    <span
                      key={p.symbol}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        p.direction === 'LONG'
                          ? 'bg-green-900 text-green-400'
                          : 'bg-red-900 text-red-400'
                      }`}
                    >
                      {p.direction[0]}{p.symbol}
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
