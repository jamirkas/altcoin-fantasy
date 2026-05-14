'use client';
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from '@/app/contract';
import TokenCard from '@/components/TokenCard';
import NeonButton from '@/components/NeonButton';
import WalletButton from '@/components/WalletButton';
import HudFrame from '@/components/HudFrame';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOURNAMENT_ID = 0;
const BASE_SEPOLIA_CHAIN_ID = 84532;

interface Token { symbol: string; price: number; direction: 'LONG' | 'SHORT' | null; }

export default function Play() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [checkingEntry, setCheckingEntry] = useState(false);
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

  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID;
  const showMsg = (msg: string, type: 'info'|'error'|'success'='info') => { setMessage(msg); setMessageType(type); };

  const checkEntry = useCallback(async (prov: ethers.BrowserProvider, addr: string) => {
    setCheckingEntry(true);
    try {
      const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, prov);
      const filter = c.filters.Entered(TOURNAMENT_ID, addr);
      const events = await c.queryFilter(filter, 0, 'latest');
      setHasEntered(events.length > 0);
    } catch { setHasEntered(false); }
    setCheckingEntry(false);
  }, []);

  const connect = (acc: string, chId: number, prov: ethers.BrowserProvider) => {
    setAccount(acc); setChainId(chId); setProvider(prov); showMsg('','info');
    if (chId === BASE_SEPOLIA_CHAIN_ID) checkEntry(prov, acc);
  };

  useEffect(() => {
    fetch(`${API_URL}/tokens`).then(r => r.json()).then(d => {
      setBenchmark(d.benchmark); setPrices(d.prices);
      if (d.captain_multiplier) setCaptainMultiplier(d.captain_multiplier);
      setTokens(d.tokens.map((s: string) => ({ symbol: s, price: d.prices[s]||0, direction: null })));
    }).catch(() => showMsg('API offline','error'));
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
    if (!account) return showMsg('Connect wallet','error');
    if (!hasEntered) return showMsg('Enter tournament first (0.001 ETH)','error');
    const order = getOrder();
    const picks = order.map(s => ({ symbol: s, direction: selectedTokens.get(s)! }));
    if (picks.length !== 3) return showMsg('Select 3 tokens','error');
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/draft`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tournament_id: TOURNAMENT_ID, player: account, picks, captain_index: captainIndex }) });
      if (r.ok) { const d = await r.json(); showMsg(`Draft submitted! Captain: ${order[d.captain_index]} (${captainMultiplier}x)`,'success'); }
      else { const e = await r.json(); showMsg(e.detail||'Error','error'); }
    } catch { showMsg('API error','error'); }
    setLoading(false);
  };

  const enterTournament = async () => {
    if (!provider || !account) return showMsg('Connect wallet','error');
    if (!isCorrectChain) return showMsg('Switch to Base Sepolia','error');
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, signer);
      let tx;
      if (referrer && ethers.isAddress(referrer))
        tx = await c.enterWithReferral(TOURNAMENT_ID, referrer, captainIndex, { value: ethers.parseEther('0.001'), gasLimit: 150000 });
      else
        tx = await c.enter(TOURNAMENT_ID, { value: ethers.parseEther('0.001'), gasLimit: 150000 });
      showMsg('Confirm in wallet (Base Sepolia)...','info');
      await tx.wait();
      setHasEntered(true);
      showMsg('Entered! Now submit draft.','success');
    } catch (e: any) { showMsg(e.reason||e.message||'Tx failed','error'); }
    setLoading(false);
  };

  const order = getOrder();
  const canDraft = account && isCorrectChain && hasEntered && selectedTokens.size === 3;

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl matrix-text font-bold tracking-wider glitch" data-text="DRAFT ROOM">DRAFT ROOM</h1>
          <p className="text-xs text-[#4D754D] font-mono mt-1.5 tracking-[0.15em] uppercase">
            SELECT 3 <span className="text-[#2A3A2A]">//</span> CAPTAIN <span className="text-[#2A3A2A]">//</span> ENTER
          </p>
        </div>

        {/* Wallet */}
        <div className="flex justify-center">
          <WalletButton account={account} chainId={chainId} provider={provider} onConnect={connect} onError={m=>showMsg(m,'error')}/>
        </div>

        {/* Messages */}
        {message&&<div className={`p-3 rounded border text-sm font-mono text-center ${
          messageType==='error'?'border-[#FF1A40] bg-[#1A0A0A] text-[#FF1A40]':
          messageType==='success'?'border-[#00FF41] bg-[#0A1A0A] text-[#00FF41]':
          'border-[#1A2A1A] bg-[#0A0A0F] text-[#C0FFC0]'
        }`}>{message}<button onClick={()=>setMessage('')} className="ml-3 text-[#4D754D]">✕</button></div>}

        {/* Entry Status */}
        {account && isCorrectChain && (
          <HudFrame variant={hasEntered ? 'green' : 'red'} title="ENTRY STATUS" subtitle={checkingEntry ? 'CHECKING' : hasEntered ? 'READY' : 'REQUIRED'}>
            <p className={`text-sm font-mono text-center ${hasEntered ? 'text-[#00FF41]' : 'text-[#FF1A40]'}`}>
              {checkingEntry ? 'CHECKING ENTRY...' : hasEntered ? '◆ ENTERED — READY TO DRAFT' : '◇ NOT ENTERED — DEPOSIT 0.001 ETH FIRST'}
            </p>
          </HudFrame>
        )}

        {/* Benchmark */}
        <HudFrame variant="gold" title={`BENCHMARK: ${benchmark}`}>
          <p className="text-center font-mono text-[#FFD700] text-lg">
            ${prices[benchmark]?.toLocaleString()||'...'}
          </p>
        </HudFrame>

        {/* Captain indicator */}
        {selectedTokens.size>0&&(
          <HudFrame variant="green" title="CAPTAIN" subtitle={`${captainMultiplier}x MULTIPLIER`}>
            <p className="text-center font-mono text-[#00FF41] text-sm font-bold">
              ⚡ {order[captainIndex]||'...'}
            </p>
          </HudFrame>
        )}

        {/* Token Grid */}
        <HudFrame variant="green" title="AVAILABLE TOKENS" subtitle={`${selectedTokens.size}/3 SELECTED`} glowing={selectedTokens.size===3}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tokens.filter(t=>t.symbol!==benchmark).map(t=>{
              const i=order.indexOf(t.symbol);
              return <TokenCard key={t.symbol} token={t} isSelected={selectedTokens.has(t.symbol)} isCaptain={i>=0&&i===captainIndex} isLong={selectedTokens.get(t.symbol)==='LONG'} isShort={selectedTokens.get(t.symbol)==='SHORT'} onToggle={toggleToken} onMakeCaptain={makeCaptain}/>;
            })}
          </div>
        </HudFrame>

        {/* Referral */}
        <HudFrame variant="cyan" title="REFERRAL" subtitle="15% REWARD">
          <input type="text" value={referrer} onChange={e=>setReferrer(e.target.value)} placeholder="0x..." className="w-full px-3 py-2 rounded bg-[#0A0A0F] border border-[#1A2A1A] text-sm text-[#C0FFC0] font-mono focus:border-[#00E5FF] focus:outline-none focus:shadow-[0_0_10px_rgba(0,229,255,0.15)] placeholder-[#2A3A2A] transition-all"/>
        </HudFrame>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <NeonButton onClick={enterTournament} disabled={!account || !isCorrectChain || hasEntered} loading={loading}>
            ENTER (0.001 ETH)
          </NeonButton>
          <NeonButton onClick={submitDraft} disabled={!canDraft} loading={loading} variant="gold">
            SUBMIT DRAFT
          </NeonButton>
        </div>

        {account && isCorrectChain && !hasEntered && (
          <p className="text-center text-[10px] text-[#FF1A40] font-mono animate-pulse">⚠ ENTER TOURNAMENT BEFORE SUBMITTING DRAFT</p>
        )}
        <p className="text-center text-[10px] text-[#4D754D] font-mono">1: ENTER (gas+0.001 ETH) • 2: DRAFT (free)</p>
      </div>
    </div>
  );
}
