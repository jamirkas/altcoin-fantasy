'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from '@/app/contract';
import TokenCard from '@/components/TokenCard';
import NeonButton from '@/components/NeonButton';
import WalletButton from '@/components/WalletButton';
import CodeRain from '@/components/CodeRain';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOURNAMENT_ID = 0;
const BASE_SEPOLIA_CHAIN_ID = '0x14A34';

interface Token { symbol: string; price: number; direction: 'LONG' | 'SHORT' | null; }

export default function Play() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
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
  const connect = (acc: string, chId: string, prov: ethers.BrowserProvider) => {
    setAccount(acc); setChainId(chId); setProvider(prov); showMsg('','info');
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
    if (!isCorrectChain) return showMsg('Switch to Base Sepolia in your wallet','error');
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
      showMsg('Entered! Now submit draft.','success');
    } catch (e: any) { showMsg(e.reason||e.message||'Tx failed','error'); }
    setLoading(false);
  };

  const order = getOrder();

  return (
    <div className="relative min-h-screen"><CodeRain/>
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="text-center"><h1 className="text-2xl matrix-text font-bold tracking-wider glitch">DRAFT ROOM</h1>
      <p className="text-xs text-[#4D804D] font-mono mt-1">SELECT 3 • CAPTAIN • ENTER</p></div>
      <div className="flex justify-center"><WalletButton account={account} chainId={chainId} provider={provider} onConnect={connect} onError={m=>showMsg(m,'error')}/></div>
      {message&&<div className={`p-3 rounded border text-sm font-mono text-center ${messageType==='error'?'border-[#FF1A40] bg-[#1A0A0A] text-[#FF1A40]':messageType==='success'?'border-[#00FF41] bg-[#0A1A0A] text-[#00FF41]':'border-[#1A3A1A] bg-[#0D0D0D] text-[#B3FFB3]'}`}>{message}<button onClick={()=>setMessage('')} className="ml-3 text-[#4D804D]">✕</button></div>}
      <div className="p-3 rounded border border-[#1A3A1A] bg-[#0D0D0D] text-sm font-mono text-center"><span className="text-[#4D804D]">BENCHMARK: </span><span className="text-[#FFD700] font-bold">{benchmark}</span><span className="text-[#4D804D]"> @ $</span><span className="text-[#B3FFB3]">{prices[benchmark]?.toLocaleString()||'...'}</span></div>
      {selectedTokens.size>0&&<div className="p-3 rounded border border-[#1A3A1A] bg-[#0D0D0D] text-sm font-mono text-center"><span className="text-[#4D804D]">CAPTAIN ({captainMultiplier}x): </span><span className="text-[#FFD700] font-bold">{order[captainIndex]||'...'}</span></div>}
      <div className="flex justify-between items-center"><span className="text-xs font-mono text-[#4D804D] uppercase tracking-wider">▸ Available Tokens</span><span className={`text-xs font-mono font-bold ${selectedTokens.size===3?'text-[#00FF41]':'text-[#4D804D]'}`}>{selectedTokens.size}/3</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tokens.filter(t=>t.symbol!==benchmark).map(t=>{const i=order.indexOf(t.symbol);return<TokenCard key={t.symbol} token={t} isSelected={selectedTokens.has(t.symbol)} isCaptain={i>=0&&i===captainIndex} isLong={selectedTokens.get(t.symbol)==='LONG'} isShort={selectedTokens.get(t.symbol)==='SHORT'} onToggle={toggleToken} onMakeCaptain={makeCaptain}/>;})}
      </div>
      <div className="p-3 rounded border border-[#1A3A1A] bg-[#0D0D0D]"><label className="text-[10px] text-[#4D804D] font-mono block mb-1 uppercase tracking-wider">Referral (15%)</label><input type="text" value={referrer} onChange={e=>setReferrer(e.target.value)} placeholder="0x..." className="w-full px-3 py-1.5 rounded bg-[#0A0A0A] border border-[#1A3A1A] text-sm text-[#B3FFB3] font-mono focus:border-[#00FF41] focus:outline-none"/></div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <NeonButton onClick={enterTournament} disabled={!account || !isCorrectChain} loading={loading}>ENTER (0.001 ETH)</NeonButton>
        <NeonButton onClick={submitDraft} disabled={!account||selectedTokens.size!==3} loading={loading} variant="gold">SUBMIT DRAFT</NeonButton>
      </div>
      <p className="text-center text-[10px] text-[#4D804D] font-mono">1: ENTER (gas+0.001 ETH) • 2: DRAFT (free)</p>
    </div></div>
  );
}
