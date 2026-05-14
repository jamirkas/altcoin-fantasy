'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from '@/app/contract';
import { useWallet } from '@/components/WalletContext';
import WalletButton from '@/components/WalletButton';
import NeonButton from '@/components/NeonButton';
import HudFrame from '@/components/HudFrame';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Profile() {
  const { account, provider, isCorrectChain } = useWallet();
  const [referralBalance, setReferralBalance] = useState('0');
  const [myDrafts, setMyDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-3xl matrix-text font-bold tracking-wider glitch" data-text="PROFILE">PROFILE</h1>
          <p className="text-xs text-[#4D754D] font-mono mt-1.5 tracking-[0.15em] uppercase">
            STATS <span className="text-[#2A3A2A]">//</span> REFERRALS <span className="text-[#2A3A2A]">//</span> HISTORY
          </p>
        </div>

        <div className="flex justify-center">
          <WalletButton />
        </div>

        {!account && (
          <HudFrame variant="cyan" title="SYSTEM STATUS">
            <p className="text-center text-sm font-mono text-[#00E5FF]">CONNECT WALLET TO VIEW PROFILE</p>
          </HudFrame>
        )}

        {account && !isCorrectChain && (
          <div className="p-4 rounded border border-[#FF1A40] bg-[#1A0A0A] text-sm font-mono text-[#FF1A40] text-center animate-pulse">
            ⚠ SWITCH TO BASE SEPOLIA IN YOUR WALLET
          </div>
        )}

        {account && isCorrectChain && <>
          <HudFrame variant="green" title="WALLET">
            <div className="space-y-3">
              <div>
                <span className="text-[9px] text-[#4D754D] font-mono tracking-[0.2em] uppercase block mb-1">Address</span>
                <span className="text-sm font-mono text-[#C0FFC0] break-all">{account}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#1A2A1A]">
                <div>
                  <span className="text-[9px] text-[#4D754D] font-mono tracking-[0.2em] uppercase block mb-0.5">Referral Rewards</span>
                  <span className="text-xl font-mono text-[#00FF41] font-bold">{Number(referralBalance).toFixed(6)} ETH</span>
                </div>
                {Number(referralBalance)>0 && <NeonButton onClick={withdraw} loading={loading} variant="gold">CLAIM</NeonButton>}
              </div>
              <div className="pt-2 border-t border-[#1A2A1A]">
                <span className="text-[9px] text-[#4D754D] font-mono tracking-[0.2em] uppercase block mb-1">Referral Link</span>
                <div className="flex gap-2">
                  <input type="text" readOnly value={`https://altcoin-fantasy.vercel.app/play?ref=${account}`} className="flex-1 px-3 py-1.5 rounded bg-[#0A0A0F] border border-[#1A2A1A] text-[10px] text-[#4D754D] font-mono"/>
                  <button onClick={()=>{navigator.clipboard.writeText(`https://altcoin-fantasy.vercel.app/play?ref=${account}`);setMessage('Copied!');}} className="px-3 py-1.5 rounded border border-[#1A2A1A] text-[10px] font-mono text-[#4D754D] hover:text-[#00FF41] hover:border-[#00FF41]/50 transition-all">COPY</button>
                </div>
              </div>
            </div>
          </HudFrame>

          <HudFrame variant="gold" title="ACHIEVEMENTS">
            <div className="grid grid-cols-2 gap-2">
              {[{name:'First Draft',unlocked:myDrafts.length>0,desc:'Submit first draft'},{name:'Captain',unlocked:myDrafts.some((d:any)=>d.captain_index!==0),desc:'Use captain boost'},{name:'Winner',unlocked:false,desc:'Top 10% finish'},{name:'Referrer',unlocked:Number(referralBalance)>0,desc:'Earn referrals'}].map(a=>(
                <div key={a.name} className={`p-3 rounded border text-center text-[10px] font-mono transition-all ${a.unlocked?'border-[#FFD700]/40 bg-[#1A1A0A]/50 text-[#FFD700] neon-box-gold':'border-[#1A2A1A] bg-[#0A0A0F] text-[#4D754D]'}`}><div className="font-bold text-xs mb-0.5">{a.unlocked?'◆':'◇'} {a.name}</div><div className="opacity-60">{a.desc}</div></div>
              ))}
            </div>
          </HudFrame>

          {myDrafts.length>0 && (
            <HudFrame variant="green" title="DRAFT HISTORY" subtitle={`${myDrafts.length} DRAFTS`}>
              {myDrafts.map((d:any,i:number)=>(
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-[#1A2A1A] last:border-0">
                  <div className="flex gap-1.5">
                    {d.picks?.map((p:any,pi:number)=>(
                      <span key={p.symbol} className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${pi===d.captain_index?'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30':p.direction==='LONG'?'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20':'bg-[#FF1A40]/10 text-[#FF1A40] border border-[#FF1A40]/20'}`}>{pi===d.captain_index?'⚡':''}{p.direction[0]}{p.symbol}</span>
                    ))}
                  </div>
                  <span className={`text-xs font-mono font-bold ${d.score>0?'text-[#00FF41]':'text-[#FF1A40]'}`}>{d.score>0?'+':''}{d.score.toFixed(2)}%</span>
                </div>
              ))}
            </HudFrame>
          )}
        </>}

        {message && (
          <div className="p-3 rounded border border-[#00FF41] bg-[#0A1A0A] text-sm font-mono text-[#00FF41] text-center">{message}<button onClick={()=>setMessage('')} className="ml-3 text-[#4D754D]">✕</button></div>
        )}
      </div>
    </div>
  );
}
