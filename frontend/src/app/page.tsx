'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MechArt from '@/components/MechArt';

const TOKEN_DATA = {
  btc: { id: 'btc', symbol: 'BTC', name: 'THE ORIGIN', color: '#F7931A', glowColor: '#FFB84D' },
  eth: { id: 'eth', symbol: 'ETH', name: 'THE VISIONARY', color: '#627EEA', glowColor: '#8B9FFF' },
  sol: { id: 'sol', symbol: 'SOL', name: 'THE SPEEDSTER', color: '#9945FF', glowColor: '#C44FFF' },
  link: { id: 'link', symbol: 'LINK', name: 'THE ORACLE', color: '#2A5ADA', glowColor: '#5B8AFF' },
  avax: { id: 'avax', symbol: 'AVAX', name: 'THE DESTROYER', color: '#E84142', glowColor: '#FF6B6B' },
};

const DEMO_MECH = [
  { token: TOKEN_DATA.btc, slot: 'head' },
  { token: TOKEN_DATA.eth, slot: 'armor' },
  { token: TOKEN_DATA.sol, slot: 'weapon' },
  { token: TOKEN_DATA.link, slot: 'secondary' },
  { token: TOKEN_DATA.avax, slot: 'legs' },
  { token: TOKEN_DATA.btc, slot: 'wings' },
];

const features = [
  { icon: '⚙', title: 'BUILD YOUR MECH', desc: 'Assemble war machines from 6 equipment slots across 5 blockchain factions. Every mech is unique — your strategy, your creation.' },
  { icon: '⚔', title: 'ENTER THE ARENA', desc: 'Pick 3 altcoins LONG or SHORT against BTC. Your mech\'s AI attributes shape your strategy. Captain boost doubles your best pick.' },
  { icon: '🏆', title: 'CLAIM THE POOL', desc: '0.001 ETH entry. Winner takes 85%. 15% referral rewards. Merkle-proof payouts. Pure on-chain fantasy league on Base.' },
];

export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, #020510 0%, #020205 60%)' }}>
      {/* Code rain background (CSS) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.3) 2px, rgba(0,255,65,0.3) 4px)',
        backgroundSize: '100% 4px',
      }} />

      {/* Animated grid */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,255,65,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.15) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        transform: `translate(${mousePos.x * 0.01}px, ${mousePos.y * 0.01}px)`,
      }} />

      {/* Ambient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.3), transparent)' }} />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(153,69,255,0.3), transparent)' }} />

      {/* Nav */}
      <nav className="relative z-50 border-b border-[#1A2A1A]/30 backdrop-blur-md bg-[#020205]/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-[0.2em] glitch" style={{ color: '#00FF41', fontFamily: "'Orbitron', sans-serif" }} data-text="MECH_LEAGUE">
            MECH LEAGUE
          </span>
          <div className="flex items-center gap-4 text-xs font-mono tracking-wider">
            <a href="/arena" className="text-[#4D754D] hover:text-[#00FF41] transition-colors">ARENA</a>
            <a href="/garage" className="text-[#4D754D] hover:text-[#00FF41] transition-colors">GARAGE</a>
            <a href="https://x.com/firstMechLeague" target="_blank" rel="noopener" className="text-[#4D754D] hover:text-[#00E5FF] transition-colors">𝕏 TWITTER</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-[calc(100vh-4rem)] px-6 gap-8 lg:gap-16 max-w-7xl mx-auto">
        {/* LEFT: Text */}
        <div className="lg:w-1/2 text-center lg:text-left space-y-6 animate-fade-in-up">
          <div className="inline-block px-3 py-1 rounded border border-[#FFD700]/30 bg-[#FFD700]/5 mb-2">
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#FFD700]">⚡ CLOSED BETA — COMING SOON</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-[0.05em]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            <span className="text-white">BUILD WAR</span><br />
            <span className="text-white">MACHINES.</span><br />
            <span style={{ color: '#00FF41' }}>BEAT THE</span>{' '}
            <span style={{ color: '#00E5FF' }}>BENCHMARK.</span><br />
            <span style={{ color: '#FFD700' }}>CLAIM ETH.</span>
          </h1>
          <p className="text-sm text-[#4D754D] font-mono max-w-lg leading-relaxed">
            The first on-chain fantasy league for altcoins. Build AI-powered mechs, 
            draft 3 tokens against Bitcoin, and compete for the prize pool. 
            Pure strategy. Real stakes. On Base.
          </p>
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <span className="px-5 py-3 rounded font-mono text-sm tracking-[0.2em] uppercase bg-[#00FF41]/10 border border-[#00FF41]/40 text-[#00FF41] cursor-not-allowed opacity-80">
              ◈ JOIN THE WAITLIST
            </span>
            <a href="https://x.com/firstMechLeague" target="_blank" rel="noopener"
              className="px-5 py-3 rounded font-mono text-sm tracking-[0.2em] uppercase bg-[#1A9DFF]/10 border border-[#1A9DFF]/40 text-[#1A9DFF] hover:bg-[#1A9DFF]/20 transition-all">
              𝕏 FOLLOW
            </a>
          </div>
        </div>

        {/* RIGHT: Mech showcase */}
        <div className="lg:w-1/2 flex justify-center items-center">
          <div className="relative" style={{ transform: `translate(${mousePos.x * -0.02}px, ${mousePos.y * -0.02}px)`, transition: 'transform 0.1s ease-out' }}>
            <div className="absolute inset-0 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, rgba(0,255,65,0.4), transparent)' }} />
            <MechArt parts={DEMO_MECH} />
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-lg border border-[#1A2A1A]/50 bg-[#0A0A0F]/80 backdrop-blur hover:border-[#00FF41]/20 transition-all duration-500 group">
              <span className="text-2xl mb-3 block group-hover:scale-110 transition-transform">{f.icon}</span>
              <h3 className="text-sm font-mono font-bold tracking-[0.15em] text-[#C0FFC0] mb-2">{f.title}</h3>
              <p className="text-[11px] text-[#4D754D] font-mono leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-t border-[#1A2A1A]/30 bg-[#050508]/90">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { value: '5', label: 'BLOCKCHAINS' },
            { value: '6', label: 'MECH SLOTS' },
            { value: '3', label: 'PICKS/TOURNAMENT' },
            { value: '85%', label: 'WINNER SHARE' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold font-mono" style={{ color: '#00FF41' }}>{s.value}</p>
              <p className="text-[9px] text-[#4D754D] font-mono tracking-[0.2em] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1A2A1A]/30 bg-[#020205] py-6 px-6 text-center">
        <p className="text-[10px] text-[#4D754D] font-mono tracking-wider">
          MECH LEAGUE • ON BASE • 2026
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="https://x.com/firstMechLeague" target="_blank" rel="noopener" className="text-[10px] text-[#2A3A2A] hover:text-[#00E5FF] font-mono transition-colors">𝕏 Twitter</a>
          <span className="text-[10px] text-[#2A3A2A] font-mono">|</span>
          <span className="text-[10px] text-[#2A3A2A] font-mono">Contract: 0x4133...B81e80</span>
        </div>
      </footer>
    </div>
  );
}
