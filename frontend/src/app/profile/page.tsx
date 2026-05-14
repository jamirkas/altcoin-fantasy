'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from '@/app/contract';
import WalletButton from '@/components/WalletButton';
import NeonButton from '@/components/NeonButton';
import CodeRain from '@/components/CodeRain';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE_SEPOLIA_CHAIN_ID = '0x14A34';

export default function Profile() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [referralBalance, setReferralBalance] = useState('0');
  const [myDrafts, setMyDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID;

  const connect = (acc: string, chId: string, prov: ethers.BrowserProvider) => {
    setAccount(acc); setChainId(chId); setProvider(prov);
  };

  useEffect(() => {
    if (!provider || !account || !isCorrectChain) return;
    new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, provider).referralBalances(account)
      .then((b: bigint) => setReferralBalance(ethers.formatEther(b))).catch(() => {});
  }, [provider, account, isCorrectChain]);

  useEffect(() => {
    if (!account) return;
    fetch(`${API_URL}/leaderboard/0`).then(r => r.json()).then(d => {
      setMyDrafts((d.leaderboard||[]).filter((e:any) => e.player.toLowerCase()===account.toLowerCase()));
    }).catch(() => {});
  }, [account]);

  const withdraw = async () => {
    if (!provider) return; setLoading(true);
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, signer);
      const tx = await c.withdrawReferral({ gasLimit: 80000 });
      await tx.wait();
      setMessage('Withdrawn!'); setReferralBalance('0');
    } catch (e: any) { setMessage(e.reason||'Failed'); }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen"><CodeRain/>
    <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="text-center"><h1 className="text-2xl matrix-text font-bold tracking-wider glitch">PROFILE</h1>
      <p className="text-xs text-[#4D804D] font-mono mt-1">STATS • REFERRALS • HISTORY</p></div>
      <div className="flex justify-center"><WalletButton account={account} chainId={chainId} provider={provider} onConnect={connect} onError={setMessage}/></div>
      {!account&&<div className="text-center py-10"><p className="text-sm font-mono text-[#4D804D]">CONNECT WALLET</p></div>}
      {account && !isCorrectChain && (
        <div className="p-3 rounded border border-[#FF1A40] bg-[#1A0A0A] text-sm font-mono text-[#FF1A40] text-center animate-pulse">
          ⚠ SWITCH TO BASE SEPOLIA IN YOUR WALLET
        </div>
      )}
      {account && isCorrectChain && <>
        <div className="p-4 rounded border border-[#1A3A1A] bg-[#0D0D0D] space-y-3">
          <div><span className="text-[10px] text-[#4D804D] font-mono uppercase tracking-wider block">Address</span><span className="text-sm font-mono text-[#B3FFB3] break-all">{account}</span></div>
          <div className="flex justify-between items-center">
            <div><span className="text-[10px] text-[#4D804D] font-mono uppercase tracking-wider block">Referral Rewards</span><span className="text-lg font-mono text-[#00FF41] font-bold">{Number(referralBalance).toFixed(6)} ETH</span></div>
            {Number(referralBalance)>0&&<NeonButton onClick={withdraw} loading={loading} variant="gold">CLAIM</NeonButton>}
          </div>
          <div><span className="text-[10px] text-[#4D804D] font-mono uppercase tracking-wider block mb-1">Referral Link</span>
          <div className="flex gap-2">
            <input type="text" readOnly value={`https://altcoin-fantasy.vercel.app/play?ref=${account}`} className="flex-1 px-3 py-1.5 rounded bg-[#0A0A0A] border border-[#1A3A1A] text-xs text-[#4D804D] font-mono"/>
            <button onClick={()=>{navigator.clipboard.writeText(`https://altcoin-fantasy.vercel.app/play?ref=${account}`);setMessage('Copied!');}} className="px-3 py-1.5 rounded border border-[#1A3A1A] text-xs font-mono text-[#4D804D] hover:text-[#00FF41] hover:border-[#00FF41]">COPY</button>
          </div></div>
        </div>
        <div className="p-4 rounded border border-[#1A3A1A] bg-[#0D0D0D]"><h3 className="text-xs font-mono text-[#4D804D] uppercase tracking-wider mb-3">Achievements</h3>
        <div className="grid grid-cols-2 gap-2">
          {[{name:'First Draft',unlocked:myDrafts.length>0,desc:'Submit first draft'},{name:'Captain',unlocked:myDrafts.some((d:any)=>d.captain_index!==0),desc:'Use captain boost'},{name:'Winner',unlocked:false,desc:'Top 10% finish'},{name:'Referrer',unlocked:Number(referralBalance)>0,desc:'Earn referrals'}].map(a=>(
            <div key={a.name} className={`p-2 rounded border text-center text-xs font-mono ${a.unlocked?'border-[#00FF41] bg-[#0A1A0A] text-[#00FF41]':'border-[#1A3A1A] bg-[#0A0A0A] text-[#4D804D]'}`}><div className="font-bold">{a.unlocked?'◆':'◇'} {a.name}</div><div className="text-[10px] opacity-70">{a.desc}</div></div>
          ))}</div></div>
        {myDrafts.length>0&&<div className="p-4 rounded border border-[#1A3A1A] bg-[#0D0D0D]"><h3 className="text-xs font-mono text-[#4D804D] uppercase tracking-wider mb-3">Draft History</h3>
        {myDrafts.map((d:any,i:number)=>(<div key={i} className="flex justify-between items-center py-2 border-b border-[#1A3A1A] last:border-0"><div className="flex gap-1.5">{d.picks?.map((p:any,pi:number)=>(<span key={p.symbol} className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${pi===d.captain_index?'bg-[#FFD700]/20 text-[#FFD700]':p.direction==='LONG'?'bg-[#00FF41]/10 text-[#00FF41]':'bg-[#FF1A40]/10 text-[#FF1A40]'}`}>{pi===d.captain_index?'⚡':''}{p.direction[0]}{p.symbol}</span>))}</div><span className={`text-xs font-mono font-bold ${d.score>0?'text-[#00FF41]':'text-[#FF1A40]'}`}>{d.score>0?'+':''}{d.score.toFixed(2)}%</span></div>))}</div>}
      </>}
      {message&&<div className="p-3 rounded border border-[#00FF41] bg-[#0A1A0A] text-sm font-mono text-[#00FF41] text-center">{message}<button onClick={()=>setMessage('')} className="ml-3 text-[#4D804D]">✕</button></div>}
    </div></div>
  );
}
