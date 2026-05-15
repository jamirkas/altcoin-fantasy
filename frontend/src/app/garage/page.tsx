'use client';
import { useState, useEffect } from 'react';
import HudFrame from '@/components/HudFrame';
import MechArt from '@/components/MechArt';
import MechBattle from '@/components/MechBattle';

// ─── Ability descriptions per slot ───
const ABILITIES: Record<string, { name: string; icon: string; desc: string }> = {
  head: { name: 'MIND HACK', icon: '🧠', desc: 'Steals enemy ability power' },
  armor: { name: 'FORTIFY', icon: '🛡️', desc: 'Grants HP shield, blocks crits' },
  weapon: { name: 'STRIKE', icon: '⚔️', desc: 'Direct damage, crit chance' },
  secondary: { name: 'DISRUPT', icon: '🔫', desc: 'Disables random enemy ability' },
  legs: { name: 'EVADE', icon: '🦿', desc: 'Chance to dodge next attack' },
  boosters: { name: 'OVERDRIVE', icon: '🚀', desc: 'All abilities recharge faster' },
};

// ─── Token definitions for the garage ───
interface TokenDef {
  id: string;
  symbol: string;
  name: string;
  color: string;
  glowColor: string;
  gradient: string;
  style: string;
  shape: string;
  desc: string;
}

const TOKENS: TokenDef[] = [
  { id: 'btc', symbol: 'BTC', name: 'THE ORIGIN', color: '#F7931A', glowColor: '#FFB84D', gradient: 'from-[#F7931A] to-[#FF6B00]', style: 'Brutalist heavy blocks', shape: '█', desc: 'Heavy armor, conservative risk' },
  { id: 'eth', symbol: 'ETH', name: 'THE VISIONARY', color: '#627EEA', glowColor: '#8B9FFF', gradient: 'from-[#627EEA] to-[#3B4CC0]', style: 'Crystalline diamond', shape: '◆', desc: 'Balanced, adaptive' },
  { id: 'sol', symbol: 'SOL', name: 'THE SPEEDSTER', color: '#9945FF', glowColor: '#C44FFF', gradient: 'from-[#9945FF] to-[#6B2FCC]', style: 'Lightning-fast sleek', shape: '⚡', desc: 'Fast reactions, aggressive' },
  { id: 'link', symbol: 'LINK', name: 'THE ORACLE', color: '#2A5ADA', glowColor: '#5B8AFF', gradient: 'from-[#2A5ADA] to-[#1A3A9A]', style: 'Network-chain linked', shape: '⛓', desc: 'On-chain data, calculated' },
  { id: 'avax', symbol: 'AVAX', name: 'THE DESTROYER', color: '#E84142', glowColor: '#FF6B6B', gradient: 'from-[#E84142] to-[#AA2020]', style: 'Sharp avalanche spikes', shape: '▲', desc: 'Maximum aggression, high risk' },
];

// ─── Equipment slots ───
interface Slot {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  attribute: string; // what stat this affects
}

const SLOTS: Slot[] = [
  { id: 'head', label: 'HEAD UNIT', subtitle: 'INTELLIGENCE CORE', icon: '🧠', attribute: 'Time Horizon' },
  { id: 'armor', label: 'CHEST ARMOR', subtitle: 'DEFENSE PLATING', icon: '🛡️', attribute: 'Risk Profile' },
  { id: 'weapon', label: 'PRIMARY WEAPON', subtitle: 'MAIN ATTACK SYSTEM', icon: '⚔️', attribute: 'Strategy DNA' },
  { id: 'secondary', label: 'SECONDARY WEAPON', subtitle: 'SUPPORT SYSTEM', icon: '🔫', attribute: 'Special Ability' },
  { id: 'legs', label: 'CHASSIS', subtitle: 'MOBILITY & TERRAIN', icon: '🦿', attribute: 'Data Source' },
  { id: 'wings', label: 'BOOSTERS', subtitle: 'SPEED & AGILITY', icon: '🚀', attribute: 'Captain Weight' },
];

// ─── Attribute mapping per token per slot ───
const ATTRIBUTES: Record<string, Record<string, string>> = {
  head: { btc: '7D SWINGER', eth: '24H DAY TRADER', sol: '1H SCALPER', link: '7D MACRO', avax: '1H AGGRESSIVE' },
  armor: { btc: 'CONSERVATIVE', eth: 'BALANCED', sol: 'AGGRESSIVE', link: 'CONSERVATIVE', avax: 'DEGENERATE' },
  weapon: { btc: 'MOMENTUM', eth: 'BREAKOUT', sol: 'MEAN REVERSION', link: 'ON-CHAIN FLOW', avax: 'BREAKOUT' },
  secondary: { btc: 'FADE CROWD', eth: 'TREND RIDER', sol: 'FOLLOW WHALE', link: 'MEAN MAGNET', avax: 'FADE CROWD' },
  legs: { btc: 'PRICE ONLY', eth: 'ORDERBOOK + VOL', sol: 'ON-CHAIN DATA', link: 'ORDERBOOK + VOL', avax: 'PRICE ONLY' },
  wings: { btc: 'DEFENSIVE', eth: 'BALANCED', sol: 'AGGRESSIVE', link: 'CALCULATED', avax: 'BERSERK' },
};

export default function Garage() {
  const [build, setBuild] = useState<Record<string, string>>({
    head: 'btc', armor: 'eth', weapon: 'sol', secondary: 'link', legs: 'avax', wings: 'btc'
  });
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [mechName, setMechName] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [deployed, setDeployed] = useState(false);
  const [stats, setStats] = useState<{ winRate: number; sharpe: number; tier: string } | null>(null);
  const [battling, setBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [battleError, setBattleError] = useState('');

  // Fight handler
  const startBattle = async () => {
    setBattling(true);
    setBattleError('');
    try {
      const myTokens = Object.values(build).map(t => TOKENS.findIndex(tk => tk.id === t));
      const enemyTokens = [0, 4, 1, 2, 3, 0]; // Random AI mech
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/battle/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechA_id: 1, mechA_tokens: myTokens, mechA_captain: 2,
          mechB_id: 99, mechB_tokens: enemyTokens, mechB_captain: 1,
        }),
      });
      if (!res.ok) throw new Error('Battle sim failed');
      const data = await res.json();
      setBattleResult(data);
    } catch (e: any) {
      setBattleError(e.message || 'Failed to start battle');
      setBattling(false);
    }
  };

  // Fetch live prices from CoinGecko
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,chainlink,avalanche-2&vs_currencies=usd&include_24hr_change=true')
      .then(r => r.json())
      .then(d => {
        setPrices({
          BTC: d.bitcoin?.usd || 87200,
          ETH: d.ethereum?.usd || 4120,
          SOL: d.solana?.usd || 187,
          LINK: d.chainlink?.usd || 24.8,
          AVAX: d['avalanche-2']?.usd || 38.5,
        });
      })
      .catch(() => {
        setPrices({ BTC: 87200, ETH: 4120, SOL: 187, LINK: 24.8, AVAX: 38.5 });
      });
  }, []);

  const setPart = (slot: string, tokenId: string) => {
    setBuild(prev => ({ ...prev, [slot]: tokenId }));
    setDeployed(false);
  };

  const getToken = (id: string) => TOKENS.find(t => t.id === id)!;

  const calculateStats = () => {
    // Simulate backtest based on build composition
    const slots = Object.entries(build);
    const diversity = new Set(Object.values(build)).size;
    const hasBTC = Object.values(build).includes('btc');
    const hasAVAX = Object.values(build).includes('avax');

    const baseWR = 50 + diversity * 3 + (hasBTC ? 5 : 0) - (hasAVAX ? 3 : 0);
    const winRate = Math.min(85, Math.max(40, baseWR + Math.floor(Math.random() * 8)));
    const sharpe = Math.round((0.5 + diversity * 0.25 + (hasBTC ? 0.3 : 0) - (hasAVAX ? 0.2 : 0)) * 10) / 10;
    const tiers = ['WOOD', 'BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ASCENDED'];
    const tier = tiers[Math.min(tiers.length - 1, Math.floor((winRate - 40) / 8))];

    setStats({ winRate, sharpe: Math.max(0.3, Math.min(3.5, sharpe)), tier });
    setDeployed(true);
  };

  // ─── Render the CSS Mech ───
  const headToken = getToken(build.head);
  const armorToken = getToken(build.armor);
  const weaponToken = getToken(build.weapon);
  const secondaryToken = getToken(build.secondary);
  const legsToken = getToken(build.legs);
  const wingsToken = getToken(build.wings);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hangar background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0A1A0A_0%,#020205_70%)]" />
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)'
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl matrix-text font-bold tracking-widest glitch" data-text="MECH GARAGE">
            MECH GARAGE
          </h1>
          <p className="text-xs text-[#4D754D] font-mono mt-2 tracking-[0.2em] uppercase">
            BUILD YOUR WAR MACHINE
            <span className="text-[#2A3A2A]"> // </span>
            6 SLOTS
            <span className="text-[#2A3A2A]"> // </span>
            5 CHAINS
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── LEFT: Mech Preview ─── */}
          <div className="lg:w-1/2">
            <HudFrame variant="green" title="MECH PREVIEW" subtitle={mechName || 'UNNAMED MECH'} glowing>
              <div className="flex justify-center items-center py-8">
                <MechPreview head={headToken} armor={armorToken} weapon={weaponToken} secondary={secondaryToken} legs={legsToken} wings={wingsToken} />
              </div>
              {/* Live prices bar */}
              <div className="flex gap-2 justify-center mt-4">
                {TOKENS.map(t => (
                  <div key={t.id} className="px-2 py-1 rounded border text-center text-[10px] font-mono" style={{ borderColor: t.color + '30', backgroundColor: t.color + '10' }}>
                    <span style={{ color: t.color }}>{t.symbol}</span>
                    <span className="text-[#C0FFC0] ml-1">${prices[t.symbol]?.toLocaleString() || '...'}</span>
                  </div>
                ))}
              </div>
            </HudFrame>
          </div>

          {/* ─── RIGHT: Equipment Slots ─── */}
          <div className="lg:w-1/2 space-y-3">
            {SLOTS.map(slot => {
              const selected = build[slot.id];
              const token = getToken(selected);
              const isActive = activeSlot === slot.id;

              return (
                <div key={slot.id}>
                  {/* Slot header — clickable */}
                  <button
                    onClick={() => setActiveSlot(isActive ? null : slot.id)}
                    className="w-full text-left px-4 py-3 rounded border transition-all duration-300"
                    style={{
                      borderColor: isActive ? token.color : '#1A2A1A',
                      backgroundColor: isActive ? token.color + '08' : '#0A0A0F',
                      boxShadow: isActive ? `0 0 15px ${token.color}15` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{slot.icon}</span>
                        <div>
                          <p className="text-xs font-mono tracking-wider" style={{ color: token.color }}>{slot.label}</p>
                          <p className="text-[9px] text-[#4D754D] font-mono">{slot.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#4D754D] font-mono hidden sm:inline">{slot.attribute}</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: token.color + '15' }}>
                          <span className="text-xs font-mono font-bold" style={{ color: token.color }}>{token.symbol}</span>
                          <span className="text-[9px]" style={{ color: token.glowColor }}>{token.shape}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded token options */}
                  {isActive && (
                    <div className="mt-2 grid grid-cols-5 gap-2 animate-fade-in-up">
                      {TOKENS.map(t => {
                        const isSel = selected === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => { setPart(slot.id, t.id); setActiveSlot(null); }}
                            className={`
                              p-3 rounded border text-center transition-all duration-300
                              ${isSel
                                ? 'shadow-lg'
                                : 'hover:border-white/10'
                              }
                            `}
                            style={{
                              borderColor: isSel ? t.color : t.color + '20',
                              backgroundColor: isSel ? t.color + '15' : '#0A0A0F',
                              boxShadow: isSel ? `0 0 20px ${t.color}30, inset 0 0 10px ${t.color}08` : 'none',
                            }}
                          >
                            <p className="text-xl mb-1">{t.shape}</p>
                            <p className="text-[10px] font-mono font-bold tracking-wider" style={{ color: t.color }}>{t.symbol}</p>
                            <p className="text-[8px] text-[#2A3A2A] font-mono mt-0.5 leading-tight">{ATTRIBUTES[slot.id]?.[t.id] || t.style}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mech Name + Deploy */}
            <HudFrame variant="cyan" title="ACTIVATE MECH" subtitle="FINAL ASSEMBLY">
              <div className="space-y-3">
                <input
                  type="text"
                  value={mechName}
                  onChange={e => setMechName(e.target.value)}
                  placeholder="NAME YOUR MECH..."
                  className="w-full px-4 py-3 rounded bg-[#0A0A0F] border border-[#1A2A1A] text-lg text-[#00E5FF] font-mono tracking-[0.2em] text-center uppercase focus:border-[#00E5FF] focus:outline-none focus:shadow-[0_0_20px_rgba(0,229,255,0.15)] placeholder-[#2A3A2A] transition-all"
                />

                <button
                  onClick={calculateStats}
                  disabled={!mechName}
                  className={`
                    w-full py-4 rounded font-mono text-base tracking-[0.2em] uppercase
                    transition-all duration-500 relative overflow-hidden
                    ${mechName
                      ? 'border border-[#FFD700] text-[#FFD700] bg-[rgba(255,215,0,0.06)] hover:bg-[rgba(255,215,0,0.12)] hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] cursor-pointer'
                      : 'border border-[#1A2A1A]/50 text-[#2A3A2A] bg-[#0A0A0F] cursor-not-allowed opacity-40'
                    }
                  `}
                >
                  <span className="relative z-10">⚡ DEPLOY TO ARENA ⚡</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </div>
            </HudFrame>

            {/* Stats + Abilities after deploy */}
            {deployed && stats && (
              <>
                <HudFrame variant="gold" title={`MECH: ${mechName}`} subtitle="COMBAT READY" glowing>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <StatCard2 label="WIN RATE" value={`${stats.winRate}%`} color="#00FF41" />
                    <StatCard2 label="TIER" value={stats.tier} color="#FFD700" />
                    <StatCard2 label="CAPTAIN" value={getToken(build[Object.keys(build)[2]]).symbol} color={getToken(build[Object.keys(build)[2]]).color} />
                  </div>

                  {/* Ability slots */}
                  <div className="mt-3 pt-3 border-t border-[#1A2A1A]">
                    <p className="text-[8px] text-[#4D754D] font-mono tracking-[0.2em] uppercase mb-2 text-center">⚡ ABILITIES</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                      {Object.entries(build).map(([slot, tokenId]) => {
                        const t = getToken(tokenId);
                        const ability = ABILITIES[slot];
                        return (
                          <div key={slot} className="py-1.5 px-1 rounded bg-[#0A0A0F] border group relative"
                            style={{ borderColor: t.color + '20' }}>
                            <span className="text-sm block">{ability?.icon}</span>
                            <p className="text-[7px] text-[#4D754D] font-mono leading-tight">{ability?.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </HudFrame>

                {/* FIGHT button */}
                <button
                  onClick={startBattle}
                  disabled={battling}
                  className="w-full py-4 rounded font-mono text-base tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden border border-[#FF1A40] text-[#FF1A40] bg-[rgba(255,26,64,0.06)] hover:bg-[rgba(255,26,64,0.12)] hover:shadow-[0_0_40px_rgba(255,26,64,0.4)] cursor-pointer mt-3"
                >
                  {battling ? (
                    <span className="relative z-10 animate-pulse">⚔ SIMULATING BATTLE...</span>
                  ) : (
                    <span className="relative z-10">⚔ FIGHT IN ARENA ⚔</span>
                  )}
                </button>

                {battleError && (
                  <p className="text-[10px] text-[#FF1A40] font-mono mt-2 text-center">{battleError}</p>
                )}
              </>
            )}

            {/* Battle overlay */}
            {battleResult && (
              <MechBattle
                result={battleResult}
                mechA_tokens={Object.values(build)}
                mechB_tokens={['0','4','1','2','3','0']}
                mechA_name={mechName}
                mechB_name="AI CHALLENGER"
                onClose={() => { setBattleResult(null); setBattling(false); }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CSS Mech Preview (neon robots) ───
function MechPreview({ head, armor, weapon, secondary, legs, wings }: {
  head: TokenDef; armor: TokenDef; weapon: TokenDef; secondary: TokenDef; legs: TokenDef; wings: TokenDef;
}) {
  const parts = [
    { token: head, slot: 'head' },
    { token: armor, slot: 'armor' },
    { token: weapon, slot: 'weapon' },
    { token: secondary, slot: 'secondary' },
    { token: legs, slot: 'legs' },
    { token: wings, slot: 'wings' },
  ];

  return (
    <div className="relative w-full max-w-xs mx-auto flex flex-col items-center">
      <MechArt parts={parts} />

      {/* Part legend */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
        {[
          { token: head, label: 'HD' },
          { token: armor, label: 'AR' },
          { token: weapon, label: 'WP' },
          { token: secondary, label: 'S2' },
          { token: legs, label: 'LG' },
          { token: wings, label: 'WG' },
        ].map(({ token, label }) => (
          <div key={label} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border"
            style={{ color: token.color, borderColor: token.color + '30', backgroundColor: token.color + '10' }}
          >
            {label}:{token.symbol}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard2({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="py-3 rounded border border-[#1A2A1A] bg-[#0A0A0F]">
      <p className="text-[8px] text-[#4D754D] font-mono tracking-[0.2em] uppercase">{label}</p>
      <p className="text-xl font-mono font-bold mt-1 matrix-text" style={{ color }}>{value}</p>
    </div>
  );
}
