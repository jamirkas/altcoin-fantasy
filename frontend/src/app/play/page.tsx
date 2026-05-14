'use client';
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from '@/app/contract';
import { useWallet, checkPlayerEntry } from '@/components/WalletContext';
import { useToast } from '@/components/Toast';
import TokenCard from '@/components/TokenCard';
import NeonButton from '@/components/NeonButton';
import WalletButton from '@/components/WalletButton';
import HudFrame from '@/components/HudFrame';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOURNAMENT_ID = 0;

interface Token { symbol: string; price: number; direction: 'LONG' | 'SHORT' | null; }
interface SavedPicks { tokenIds: number[]; directions: number[]; captainIndex: number; salt: string; }

export default function Play() {
  const { account, provider, isCorrectChain } = useWallet();
  const [hasEntered, setHasEntered] = useState(false);
  const [checkingEntry, setCheckingEntry] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [benchmark, setBenchmark] = useState('BTC');
  const [captainMultiplier, setCaptainMultiplier] = useState(2);
  const [selectedTokens, setSelectedTokens] = useState<Map<string, 'LONG' | 'SHORT'>>(new Map());
  const [captainIndex, setCaptainIndex] = useState(0);
  const [referrer, setReferrer] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info'|'error'|'success'>('info');
  const [savedPicks, setSavedPicks] = useState<SavedPicks | null>(null);
  const [draftDeadline, setDraftDeadline] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const { toast } = useToast();

  const showMsg = (msg: string, type: 'info'|'error'|'success'='info') => { setMessage(msg); setMessageType(type); };

  // Check entry + commitment status
  useEffect(() => {
    if (!provider || !account || !isCorrectChain) { setHasEntered(false); setCommitted(false); setRevealed(false); return; }
    setCheckingEntry(true);
    Promise.all([
      checkPlayerEntry(provider, account, TOURNAMENT_ID),
      checkCommitmentStatus(provider, account),
      fetchTournamentDeadlines(provider),
    ]).then(([entered, { committed: cm, revealed: rv }, { draftDeadline: dd, endTime: et }]) => {
      setHasEntered(entered);
      setCommitted(cm);
      setRevealed(rv);
      setDraftDeadline(dd);
      setEndTime(et);
      setCheckingEntry(false);
    });
  }, [provider, account, isCorrectChain]);

  useEffect(() => {
    fetch(`${API_URL}/tokens`).then(r => r.json()).then(d => {
      setBenchmark(d.benchmark); setPrices(d.prices);
      if (d.captain_multiplier) setCaptainMultiplier(d.captain_multiplier);
      setTokens(d.tokens.map((s: string) => ({ symbol: s, price: d.prices[s]||0, direction: null })));
    }).catch(() => {
      // Mock data for visual preview when API is offline
      const mockPrices: Record<string,number> = { BTC: 87245, ETH: 4120, SOL: 187, LINK: 24.8, ARB: 1.82, OP: 2.95, MATIC: 0.92, AVAX: 38.5, SUI: 1.45, APT: 8.75 };
      const mockTokens = ['ETH','SOL','LINK','ARB','OP','MATIC','AVAX','SUI','APT'];
      setBenchmark('BTC');
      setPrices(mockPrices);
      setCaptainMultiplier(2);
      setTokens(mockTokens.map(s => ({ symbol: s, price: mockPrices[s], direction: null })));
    });
  }, []);

  const toggleToken = (symbol: string, direction: 'LONG'|'SHORT') => {
    const next = new Map(selectedTokens);
    if (next.get(symbol) === direction) next.delete(symbol);
    else if (next.size < 3 || next.has(symbol)) next.set(symbol, direction);
    setSelectedTokens(next);
    const order = Array.from(next.keys());
    if (captainIndex >= order.length) setCaptainIndex(Math.max(0, order.length-1));
  };
  const getOrder = () => Array.from(selectedTokens.keys());
  const makeCaptain = (s: string) => { const i = getOrder().indexOf(s); if (i>=0) setCaptainIndex(i); };

  const submitDraft = async () => {
    if (!account) return;
    const order = getOrder();
    const picks = order.map(s => ({
      symbol: s,
      direction: selectedTokens.get(s) === 'LONG' ? 0 : 1,
    }));
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/draft`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ tournament_id: TOURNAMENT_ID, player: account, picks, captain_index: captainIndex })
      });
      if (!r.ok) { const e = await r.json(); toast(e.detail||'API draft failed', 'error'); }
    } catch { toast('API error', 'error'); }
    setLoading(false);
  };

  const commitDraft = async () => {
    if (!account || !provider) return toast('Connect wallet', 'error');
    const order = getOrder();
    if (order.length !== 3) return toast('Select exactly 3 tokens', 'error');

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, signer);

      // Map symbols to token IDs (indices in the API token list)
      const apiTokens = tokens.filter(t => t.symbol !== benchmark).map(t => t.symbol);
      const tokenIds = order.map(s => {
        const id = apiTokens.indexOf(s);
        if (id === -1) throw new Error(`Token ${s} not found`);
        return id;
      });
      const directions = order.map(s => selectedTokens.get(s) === 'LONG' ? 0 : 1);

      // Generate salt
      const salt = ethers.hexlify(ethers.randomBytes(32));

      // Build commitment hash
      const hash = ethers.solidityPackedKeccak256(
        ['bytes32', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
        [salt, tokenIds[0], directions[0], tokenIds[1], directions[1], tokenIds[2], directions[2], captainIndex]
      );

      toast('Confirm commitment in wallet...', 'info');
      const tx = await c.commitDraft(TOURNAMENT_ID, hash, { gasLimit: 100000 });
      await tx.wait();

      // Save picks for later reveal
      setSavedPicks({ tokenIds, directions, captainIndex, salt });
      setCommitted(true);
      toast('⚔ Committed — picks encrypted. Reveal after deadline.', 'success');
    } catch (e: any) {
      toast(e.reason || e.message || 'Commit failed', 'error');
    }
    setLoading(false);
  };

  const revealDraft = async () => {
    if (!account || !provider) return toast('Connect wallet', 'error');
    if (!savedPicks) return toast('No saved picks — did you commit?', 'error');

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, signer);

      toast('Confirm reveal in wallet...', 'info');
      const tx = await c.revealDraft(
        TOURNAMENT_ID,
        savedPicks.tokenIds,
        savedPicks.directions,
        savedPicks.captainIndex,
        savedPicks.salt,
        { gasLimit: 150000 }
      );
      await tx.wait();
      setRevealed(true);

      // Also submit to API for scoring
      const order = getOrder();
      const picks = order.map(s => ({
        symbol: s,
        direction: selectedTokens.get(s) === 'LONG' ? 0 : 1,
      }));
      await fetch(`${API_URL}/draft`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ tournament_id: TOURNAMENT_ID, player: account, picks, captain_index: savedPicks.captainIndex })
      });

      toast('🔓 Revealed! Picks visible, scoring begins.', 'success');
    } catch (e: any) {
      toast(e.reason || e.message || 'Reveal failed', 'error');
    }
    setLoading(false);
  };

  const enterTournament = async () => {
    if (!provider || !account) return toast('Connect wallet', 'error');
    if (!isCorrectChain) return toast('Switch to Base Sepolia', 'error');
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, signer);
      let tx;
      if (referrer && ethers.isAddress(referrer))
        tx = await c.enterWithReferral(TOURNAMENT_ID, referrer, captainIndex, { value: ethers.parseEther('0.001'), gasLimit: 150000 });
      else
        tx = await c.enter(TOURNAMENT_ID, { value: ethers.parseEther('0.001'), gasLimit: 150000 });
      toast('Confirm transaction in wallet...', 'info');
      await tx.wait();
      setHasEntered(true);
      toast('Paid 0.001 ETH — now commit your draft', 'success');
    } catch (e: any) { toast(e.reason||e.message||'Transaction failed', 'error'); }
    setLoading(false);
  };

  // ─── Phase detection ───
  const now = Math.floor(Date.now() / 1000);
  const isBeforeDeadline = draftDeadline > 0 && now < draftDeadline;
  const isRevealWindow = draftDeadline > 0 && now >= draftDeadline && endTime > 0 && now < endTime;
  const isClosed = endTime > 0 && now >= endTime;
  const isEnteredAndCommitted = hasEntered && committed;

  const order = getOrder();
  const canCommit = account && isCorrectChain && hasEntered && !committed && selectedTokens.size === 3 && isBeforeDeadline;
  const canReveal = isEnteredAndCommitted && !revealed && (isRevealWindow || isClosed) && savedPicks !== null;

  const commitLabel = !account ? 'CONNECT WALLET FIRST'
    : !isCorrectChain ? 'SWITCH TO BASE SEPOLIA'
    : !hasEntered ? 'PAY 0.001 ETH FIRST'
    : committed ? '✓ COMMITTED'
    : !isBeforeDeadline ? 'DEADLINE PASSED'
    : selectedTokens.size < 3 ? `SELECT ${3 - selectedTokens.size} MORE`
    : 'COMMIT DRAFT (ENCRYPTED)';

  const phaseBadge = checkingEntry ? 'CHECKING...'
    : revealed ? '◆ REVEALED'
    : committed ? '◆ COMMITTED — WAIT FOR REVEAL'
    : hasEntered ? '◇ ENTERED — COMMIT YOUR DRAFT'
    : '◇ NOT ENTERED';

  const phaseColor = revealed ? '#FFD700'
    : committed ? '#00E5FF'
    : hasEntered ? '#00FF41'
    : '#FF1A40';

  // Timer display
  const timeDisplay = isBeforeDeadline && draftDeadline > 0
    ? `DRAFT CLOSES IN ${formatCountdown(draftDeadline - now)}`
    : isRevealWindow && endTime > 0
    ? `⚔ REVEAL PHASE — ${formatCountdown(endTime - now)} REMAINING`
    : isClosed
    ? 'TOURNAMENT ENDED'
    : '';

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-3xl matrix-text font-bold tracking-wider glitch" data-text="DRAFT ROOM">
            {committed && !revealed ? 'DARK FOREST' : 'DRAFT ROOM'}
          </h1>
          <p className="text-xs text-[#4D754D] font-mono mt-1.5 tracking-[0.15em] uppercase">
            {committed && !revealed
              ? 'PICKS ENCRYPTED' : 'SELECT 3'}
            <span className="text-[#2A3A2A]"> // </span>
            CAPTAIN
            <span className="text-[#2A3A2A]"> // </span>
            {committed && !revealed ? 'WAIT FOR REVEAL' : hasEntered ? 'COMMIT' : 'ENTER'}
          </p>
        </div>

        <div className="flex justify-center">
          <WalletButton />
        </div>

        {/* Timer banner */}
        {timeDisplay && (
          <div className={`
            p-3 rounded border text-sm font-mono text-center
            ${isRevealWindow
              ? 'border-[#FFD700]/30 bg-[#1A1A0A]/50 text-[#FFD700] animate-pulse'
              : 'border-[#00E5FF]/20 bg-[#0A1A1A]/50 text-[#00E5FF]'}
          `}>
            {timeDisplay}
          </div>
        )}

        {/* Info messages */}
        {message && (
          <div className={`p-3 rounded border text-sm font-mono text-center ${
            messageType==='error'?'border-[#FF1A40] bg-[#1A0A0A] text-[#FF1A40]':
            messageType==='success'?'border-[#00FF41] bg-[#0A1A0A] text-[#00FF41]':
            'border-[#1A2A1A] bg-[#0A0A0F] text-[#C0FFC0]'
          }`}>{message}<button onClick={()=>setMessage('')} className="ml-3 text-[#4D754D]">✕</button></div>
        )}

        {account && isCorrectChain && (
          <HudFrame variant={hasEntered ? 'green' : 'red'} title="ENTRY STATUS" subtitle={checkingEntry ? 'CHECKING' : phaseBadge}>
            <p className={`text-sm font-mono text-center`} style={{ color: phaseColor }}>
              {checkingEntry ? 'CHECKING ENTRY...' : phaseBadge}
            </p>
          </HudFrame>
        )}

        <HudFrame variant="gold" title={`BENCHMARK: ${benchmark}`}>
          <p className="text-center font-mono text-[#FFD700] text-lg">
            ${prices[benchmark]?.toLocaleString()||'...'}
          </p>
        </HudFrame>

        {selectedTokens.size>0 && !committed && (
          <HudFrame variant="green" title="CAPTAIN" subtitle={`${captainMultiplier}x MULTIPLIER`}>
            <p className="text-center font-mono text-[#00FF41] text-sm font-bold">⚡ {order[captainIndex]||'...'}</p>
          </HudFrame>
        )}

        {/* Committed status card */}
        {committed && (
          <HudFrame variant="cyan" title="DARK FOREST" subtitle="COMMIT-REVEAL ACTIVE" glowing={!revealed}>
            <div className="text-center space-y-2">
              <p className="font-mono text-sm text-[#00E5FF]">
                {revealed
                  ? '🔓 REVEALED — PICKS PUBLIC'
                  : '🔒 ENCRYPTED — REVEAL AFTER DEADLINE'}
              </p>
              {isRevealWindow && !revealed && (
                <p className="text-xs text-[#FFD700] font-mono animate-pulse">
                  ⚡ REVEAL PHASE NOW OPEN — SUBMIT YOUR REVEAL
                </p>
              )}
            </div>
          </HudFrame>
        )}

        {/* Token grid — hide when committed */}
        {!committed && (
          <HudFrame variant="green" title="AVAILABLE TOKENS" subtitle={`${selectedTokens.size}/3 SELECTED`} glowing={selectedTokens.size===3}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger">
              {tokens.filter(t=>t.symbol!==benchmark).map(t=>{
                const i=order.indexOf(t.symbol);
                return <TokenCard key={t.symbol} token={t} isSelected={selectedTokens.has(t.symbol)} isCaptain={i>=0&&i===captainIndex} isLong={selectedTokens.get(t.symbol)==='LONG'} isShort={selectedTokens.get(t.symbol)==='SHORT'} onToggle={toggleToken} onMakeCaptain={makeCaptain}/>;
              })}
            </div>
          </HudFrame>
        )}

        {/* Encrypted picks display after commit */}
        {committed && !revealed && (
          <HudFrame variant="cyan" title="YOUR PICKS" subtitle="[ ENCRYPTED UNTIL REVEAL ]">
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2].map(i => (
                <div key={i} className="py-4 px-2 rounded border border-[#1A2A1A] bg-[#0A0A0F] text-center">
                  <p className="text-xs text-[#4D754D] font-mono">PICK {i+1}</p>
                  <p className="text-lg font-mono text-[#00E5FF] matrix-text">???</p>
                  <p className="text-[10px] text-[#2A3A2A] font-mono">ENCRYPTED</p>
                </div>
              ))}
            </div>
          </HudFrame>
        )}

        {/* Referral — only before commit */}
        {!committed && (
          <HudFrame variant="cyan" title="REFERRAL" subtitle="15% REWARD">
            <input type="text" value={referrer} onChange={e=>setReferrer(e.target.value)} placeholder="0x..." className="w-full px-3 py-2 rounded bg-[#0A0A0F] border border-[#1A2A1A] text-sm text-[#C0FFC0] font-mono focus:border-[#00E5FF] focus:outline-none focus:shadow-[0_0_10px_rgba(0,229,255,0.15)] placeholder-[#2A3A2A] transition-all"/>
          </HudFrame>
        )}

        {/* ─── ACTION AREA ─── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Enter button */}
            {!committed && (
              <NeonButton
                onClick={enterTournament}
                disabled={!account || !isCorrectChain || hasEntered}
                loading={loading && !committed}
              >
                {hasEntered ? '✓ ENTERED' : 'ENTER (0.001 ETH)'}
              </NeonButton>
            )}

            {/* Commit button — before deadline */}
            {!committed && hasEntered && (
              <button
                onClick={commitDraft}
                disabled={!canCommit || loading}
                className={`
                  relative px-6 py-2.5 rounded font-mono text-sm tracking-[0.15em] uppercase
                  transition-all duration-300 overflow-hidden
                  active:scale-95
                  ${canCommit
                    ? 'border border-[#00E5FF] text-[#00E5FF] bg-[rgba(0,229,255,0.08)] hover:bg-[rgba(0,229,255,0.18)] hover:shadow-[0_0_30px_rgba(0,229,255,0.3)] cursor-pointer'
                    : 'border border-[#1A2A1A]/50 text-[#2A3A2A] bg-[#0A0A0F] cursor-not-allowed opacity-50'
                  }
                `}
              >
                <span className="absolute inset-0 bg-white/5 rounded scale-0 group-active:scale-100 transition-transform duration-300" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <><span className="matrix-spinner w-3.5 h-3.5" /> PROCESSING...</>
                  ) : canCommit ? (
                    <>🔒 COMMIT DRAFT</>
                  ) : (
                    <>{!isBeforeDeadline ? '⏰' : '🔒'} {commitLabel}</>
                  )}
                </span>
              </button>
            )}

            {/* Reveal button — after deadline */}
            {committed && !revealed && (
              <NeonButton
                onClick={revealDraft}
                disabled={!canReveal || loading}
                loading={loading}
                variant="gold"
              >
                {loading ? 'REVEALING...' : canReveal ? '🔓 REVEAL DRAFT' : '⏳ WAIT FOR REVEAL PHASE'}
              </NeonButton>
            )}
          </div>

          {account && isCorrectChain && !hasEntered && !committed && (
            <p className="text-center text-[10px] text-[#FF1A40] font-mono animate-pulse">
              ⚠ PAY 0.001 ETH TO UNLOCK DRAFT COMMITMENT
            </p>
          )}
          <p className="text-center text-[10px] text-[#4D754D] font-mono">
            {committed
              ? revealed
                ? 'REVEALED — SCORING IN PROGRESS'
                : 'WAITING FOR REVEAL PHASE TO BEGIN'
              : hasEntered
                ? 'SELECT 3 TOKENS → COMMIT ENCRYPTED DRAFT → REVEAL AFTER DEADLINE'
                : '1: ENTER → 2: SELECT 3 TOKENS → 3: COMMIT → 4: REVEAL'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

async function checkCommitmentStatus(provider: ethers.BrowserProvider, addr: string) {
  try {
    const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, provider);
    const [commitment, isRevealed] = await Promise.all([
      c.getCommitment(TOURNAMENT_ID, addr),
      c.isRevealed(TOURNAMENT_ID, addr),
    ]);
    return {
      committed: commitment !== ethers.ZeroHash,
      revealed: isRevealed,
    };
  } catch {
    return { committed: false, revealed: false };
  }
}

async function fetchTournamentDeadlines(provider: ethers.BrowserProvider) {
  try {
    const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, provider);
    const t = await c.getTournament(TOURNAMENT_ID);
    return {
      draftDeadline: Number(t.draftDeadline),
      endTime: Number(t.endTime),
    };
  } catch {
    return { draftDeadline: 0, endTime: 0 };
  }
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0S';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}H ${m}M`;
  if (m > 0) return `${m}M ${s}S`;
  return `${s}S`;
}
