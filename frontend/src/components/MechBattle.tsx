'use client';
import { useState, useEffect, useRef } from 'react';
import MechArt from '@/components/MechArt';

interface BattleEvent {
  tick: number; time: number; actor: string; slot: number;
  ability_name: string; icon: string;
  damage: number; shielded: number; dodged: boolean; crit: boolean;
  effect: string; mechA_hp: number; mechB_hp: number;
}

interface BattleResult {
  winner: string; mechA_hp_final: number; mechB_hp_final: number;
  mechA_max_hp: number; mechB_max_hp: number;
  events: BattleEvent[];
  mechA_powers: Record<string, number>;
  mechB_powers: Record<string, number>;
  prices_24h: Record<string, number>;
  seed: string;
}

const TOKEN_DATA: Record<string, { id: string; symbol: string; name: string; color: string; glowColor: string }> = {
  '0': { id: 'btc', symbol: 'BTC', name: 'THE ORIGIN', color: '#F7931A', glowColor: '#FFB84D' },
  '1': { id: 'eth', symbol: 'ETH', name: 'THE VISIONARY', color: '#627EEA', glowColor: '#8B9FFF' },
  '2': { id: 'sol', symbol: 'SOL', name: 'THE SPEEDSTER', color: '#9945FF', glowColor: '#C44FFF' },
  '3': { id: 'link', symbol: 'LINK', name: 'THE ORACLE', color: '#2A5ADA', glowColor: '#5B8AFF' },
  '4': { id: 'avax', symbol: 'AVAX', name: 'THE DESTROYER', color: '#E84142', glowColor: '#FF6B6B' },
};

export default function MechBattle({
  result,
  mechA_tokens,
  mechB_tokens,
  mechA_name,
  mechB_name,
  onClose,
}: {
  result: BattleResult;
  mechA_tokens: string[];
  mechB_tokens: string[];
  mechA_name: string;
  mechB_name: string;
  onClose?: () => void;
}) {
  const [currentEvent, setCurrentEvent] = useState(0);
  const [hpA, setHpA] = useState(result.mechA_max_hp);
  const [hpB, setHpB] = useState(result.mechB_max_hp);
  const [shake, setShake] = useState<'left' | 'right' | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; text: string; side: string; color: string }[]>([]);
  const [finished, setFinished] = useState(false);
  const [battleStarted, setBattleStarted] = useState(false);
  const countdownRef = useRef(3);
  const [countdown, setCountdown] = useState(3);

  // Countdown before battle
  useEffect(() => {
    if (battleStarted) return;
    const timer = setInterval(() => {
      countdownRef.current--;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        clearInterval(timer);
        setBattleStarted(true);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [battleStarted]);

  // Play events
  useEffect(() => {
    if (!battleStarted || currentEvent >= result.events.length) return;

    const event = result.events[currentEvent];
    const delay = currentEvent === 0 ? 400 : 600; // first event slower

    const timer = setTimeout(() => {
      setHpA(event.mechA_hp);
      setHpB(event.mechB_hp);

      // Screen shake on damage
      if (event.damage > 30) {
        setShake(event.actor === 'A' ? 'right' : 'left');
        setTimeout(() => setShake(null), 300);
      }

      // Floating damage/effect text
      const floatingId = Date.now();
      let ft: { text: string; side: string; color: string } | null = null;

      if (event.damage > 0) {
        const side = event.actor === 'A' ? 'right' : 'left';
        let text = `-${event.damage}`;
        let color = '#FF1A40';
        if (event.crit) { text = `💀 ${text} CRIT!`; color = '#FFD700'; }
        if (event.shielded > 0) { text += ` (🛡️${event.shielded})`; color = '#00E5FF'; }
        if (event.dodged) { text = '↗ DODGE!'; color = '#00FF41'; }
        ft = { text, side, color };
      } else if (event.effect) {
        const side = event.actor === 'A' ? 'left' : 'right';
        ft = { text: event.effect, side, color: event.actor === 'A' ? '#C44FFF' : '#FFB84D' };
      }

      if (ft) {
        setFloatingTexts(prev => [...prev.slice(-5), { id: floatingId, ...ft }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== floatingId)), 1500);
      }

      if (currentEvent + 1 >= result.events.length) {
        setTimeout(() => setFinished(true), 800);
      }

      setCurrentEvent(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentEvent, battleStarted]);

  const mechAParts = mechA_tokens.map((t, i) => ({ token: TOKEN_DATA[t], slot: ['head', 'armor', 'weapon', 'secondary', 'legs', 'boosters'][i] }));
  const mechBParts = mechB_tokens.map((t, i) => ({ token: TOKEN_DATA[t], slot: ['head', 'armor', 'weapon', 'secondary', 'legs', 'boosters'][i] }));

  const hpPctA = Math.max(0, (hpA / result.mechA_max_hp) * 100);
  const hpPctB = Math.max(0, (hpB / result.mechB_max_hp) * 100);

  const event = currentEvent < result.events.length ? result.events[currentEvent] : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #020510 0%, #000 70%)' }}>
      {/* Close button */}
      {finished && onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 z-20 px-4 py-2 rounded border border-[#FFD700]/30 text-[#FFD700] font-mono text-xs hover:bg-[#FFD700]/10 transition-all">
          ← BACK TO ARENA
        </button>
      )}

      {/* Countdown overlay */}
      {!battleStarted && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <span className="text-8xl font-bold animate-pulse" style={{ color: '#00FF41', fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 60px #00FF41' }}>
            {countdown}
          </span>
        </div>
      )}

      {/* Victory overlay */}
      {finished && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 animate-fade-in-up">
          <span className="text-6xl font-bold mb-4" style={{
            fontFamily: "'Orbitron', sans-serif",
            color: result.winner === 'A' ? '#00FF41' : result.winner === 'B' ? '#FF1A40' : '#FFD700',
            textShadow: `0 0 80px ${result.winner === 'A' ? '#00FF41' : '#FF1A40'}`,
          }}>
            {result.winner === 'A' ? `${mechA_name} WINS!` : result.winner === 'B' ? `${mechB_name} WINS!` : 'DRAW!'}
          </span>
          <div className="flex gap-8 text-sm font-mono">
            <span style={{ color: '#C0FFC0' }}>{mechA_name}: {result.mechA_hp_final} HP</span>
            <span style={{ color: '#4D754D' }}>vs</span>
            <span style={{ color: '#C0FFC0' }}>{mechB_name}: {result.mechB_hp_final} HP</span>
          </div>
        </div>
      )}

      {/* Names + HP bars */}
      <div className="w-full max-w-4xl px-6 flex items-center justify-between mb-6">
        <div className="text-center w-48">
          <p className="text-sm font-mono font-bold tracking-wider mb-1" style={{ color: '#C44FFF' }}>{mechA_name}</p>
          <div className="h-3 rounded-full overflow-hidden bg-[#1A0A1A] border border-[#2A1A2A]">
            <div className="h-full transition-all duration-300 rounded-full" style={{
              width: `${hpPctA}%`,
              background: `linear-gradient(90deg, #9945FF, #C44FFF)`,
              boxShadow: '0 0 12px #C44FFF40',
            }} />
          </div>
          <p className="text-[10px] font-mono mt-1" style={{ color: '#C44FFF' }}>{hpA}/{result.mechA_max_hp}</p>
        </div>

        <div className="text-center">
          <span className="text-3xl font-bold" style={{ color: '#FFD700', fontFamily: "'Orbitron', sans-serif" }}>⚔</span>
        </div>

        <div className="text-center w-48">
          <p className="text-sm font-mono font-bold tracking-wider mb-1" style={{ color: '#FFB84D' }}>{mechB_name}</p>
          <div className="h-3 rounded-full overflow-hidden bg-[#1A0A1A] border border-[#2A1A2A]">
            <div className="h-full transition-all duration-300 rounded-full" style={{
              width: `${hpPctB}%`,
              background: `linear-gradient(90deg, #F7931A, #FFB84D)`,
              boxShadow: '0 0 12px #FFB84D40',
            }} />
          </div>
          <p className="text-[10px] font-mono mt-1" style={{ color: '#FFB84D' }}>{hpB}/{result.mechB_max_hp}</p>
        </div>
      </div>

      {/* Battlefield */}
      <div className={`relative flex items-center justify-center gap-12 lg:gap-24 ${shake === 'left' ? 'animate-shake-left' : shake === 'right' ? 'animate-shake-right' : ''}`}>
        {/* Mech A */}
        <div className={`transition-all duration-300 ${event?.actor === 'A' && event?.slot === 2 ? 'scale-110 -translate-x-4' : event?.actor === 'B' && event?.damage > 0 ? 'opacity-50' : ''}`}>
          <div className="scale-75">
            <MechArt parts={mechAParts} />
          </div>
        </div>

        {/* Center — current action */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none">
          {event && (
            <div className="animate-fade-in-up">
              <span className="text-4xl block mb-1">{event.icon}</span>
              <span className="text-xs font-mono font-bold tracking-[0.15em] block px-3 py-1 rounded"
                style={{
                  color: event.actor === 'A' ? '#C44FFF' : '#FFB84D',
                  background: event.actor === 'A' ? '#9945FF15' : '#F7931A15',
                  border: `1px solid ${event.actor === 'A' ? '#9945FF30' : '#F7931A30'}`,
                }}>
                {event.ability_name}
              </span>
            </div>
          )}
        </div>

        {/* Mech B */}
        <div className={`transition-all duration-300 ${event?.actor === 'B' && event?.slot === 2 ? 'scale-110 translate-x-4' : event?.actor === 'A' && event?.damage > 0 ? 'opacity-50' : ''}`}>
          <div className="scale-75">
            <MechArt parts={mechBParts} />
          </div>
        </div>
      </div>

      {/* Floating texts */}
      {floatingTexts.map(ft => (
        <div key={ft.id} className={`fixed z-30 pointer-events-none animate-float-up ${ft.side === 'left' ? 'left-1/4' : 'right-1/4'}`}
          style={{ bottom: '50%', color: ft.color, fontSize: ft.text.includes('CRIT') ? '28px' : '20px', fontFamily: "'Orbitron', sans-serif", fontWeight: 'bold', textShadow: `0 0 20px ${ft.color}` }}>
          {ft.text}
        </div>
      ))}

      {/* Event log (bottom) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {result.events.slice(Math.max(0, currentEvent - 3), currentEvent + 1).map((e, i) => (
          <div key={i} className="px-2 py-1 rounded text-[9px] font-mono opacity-60"
            style={{ color: e.actor === 'A' ? '#C44FFF' : '#FFB84D', border: `1px solid ${e.actor === 'A' ? '#9945FF20' : '#F7931A20'}` }}>
            {e.icon} {e.ability_name}
          </div>
        ))}
      </div>
    </div>
  );
}
