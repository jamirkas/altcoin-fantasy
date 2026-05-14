'use client';
import { useState } from 'react';
import HudFrame from '@/components/HudFrame';

// ─── Agent DNA Blocks ───
interface AgentConfig {
  dna: 'momentum' | 'mean_reversion' | 'breakout' | 'onchain_flow';
  dataSource: 'price' | 'orderbook' | 'onchain';
  timeHorizon: '1h' | '24h' | '7d';
  risk: 'conservative' | 'balanced' | 'aggressive' | 'degenerate';
  ability: 'fade_crowd' | 'follow_whale' | 'trend_rider' | 'mean_reversion';
}

const DNA_OPTIONS = [
  { id: 'momentum', label: 'MOMENTUM', desc: 'Follow the trend — buy winners', icon: '📈' },
  { id: 'mean_reversion', label: 'MEAN REVERSION', desc: 'Fade extremes — buy dips', icon: '📉' },
  { id: 'breakout', label: 'BREAKOUT', desc: 'Catch explosions — enter on breaks', icon: '💥' },
  { id: 'onchain_flow', label: 'ON-CHAIN FLOW', desc: 'Track whales — follow smart money', icon: '🐋' },
] as const;

const DATA_OPTIONS = [
  { id: 'price', label: 'PRICE ONLY', desc: 'Clean & simple — OHLCV', icon: '💹' },
  { id: 'orderbook', label: 'ORDERBOOK + VOL', desc: 'Depth + liquidity analysis', icon: '📊' },
  { id: 'onchain', label: 'ON-CHAIN DATA', desc: 'DEX volume, whale alerts, TVL', icon: '⛓️' },
] as const;

const TIME_OPTIONS = [
  { id: '1h', label: 'SCALPER (1H)', desc: 'React fast — hourly signals', icon: '⚡' },
  { id: '24h', label: 'DAY TRADER (24H)', desc: 'Daily rotations', icon: '🌅' },
  { id: '7d', label: 'SWINGER (7D)', desc: 'Weekly macro plays', icon: '🌊' },
] as const;

const RISK_OPTIONS = [
  { id: 'conservative', label: 'CONSERVATIVE', desc: 'Low risk, steady gains', icon: '🛡️', color: '#00FF41' },
  { id: 'balanced', label: 'BALANCED', desc: 'Moderate risk-reward', icon: '⚖️', color: '#FFD700' },
  { id: 'aggressive', label: 'AGGRESSIVE', desc: 'High risk, high reward', icon: '⚔️', color: '#FF6B35' },
  { id: 'degenerate', label: 'DEGENERATE', desc: 'Full degen — YOLO', icon: '🎰', color: '#FF1A40' },
] as const;

const ABILITY_OPTIONS = [
  { id: 'fade_crowd', label: 'FADE THE CROWD', desc: 'Go against sentiment', icon: '🔄' },
  { id: 'follow_whale', label: 'FOLLOW WHALES', desc: 'Copy big money moves', icon: '🐋' },
  { id: 'trend_rider', label: 'TREND RIDER', desc: 'Extended trend following', icon: '🏄' },
  { id: 'mean_reversion', label: 'MEAN MAGNET', desc: 'Regression to mean plays', icon: '🧲' },
] as const;

export default function AgentBuilder() {
  const [config, setConfig] = useState<AgentConfig>({
    dna: 'momentum',
    dataSource: 'price',
    timeHorizon: '24h',
    risk: 'balanced',
    ability: 'trend_rider',
  });

  const [agentName, setAgentName] = useState('');
  const [generated, setGenerated] = useState(false);
  const [stats, setStats] = useState<{ winRate: number; sharpe: number; tier: string } | null>(null);

  const updateConfig = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setGenerated(false);
    setStats(null);
  };

  const generateAgent = () => {
    // Simulate backtest generation (real engine plugs in here)
    const seed = config.dna.length + config.dataSource.length + config.risk.length + config.ability.length;
    const winRate = 45 + (seed % 35); // 45-80%
    const sharpe = 0.5 + ((seed * 7) % 25) / 10; // 0.5-3.0
    const tiers = ['WOOD', 'BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];
    const tier = tiers[Math.floor((winRate - 45) / 8)];

    setStats({ winRate, sharpe: Math.round(sharpe * 10) / 10, tier });
    setGenerated(true);
  };

  const riskColor = RISK_OPTIONS.find(r => r.id === config.risk)?.color || '#FFD700';

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-3xl matrix-text font-bold tracking-wider glitch" data-text="AGENT BUILDER">
            AGENT BUILDER
          </h1>
          <p className="text-xs text-[#4D754D] font-mono mt-1.5 tracking-[0.15em] uppercase">
            BUILD YOUR AI FIGHTER
            <span className="text-[#2A3A2A]"> // </span>
            5 DNA SLOTS
            <span className="text-[#2A3A2A]"> // </span>
            DEPLOY TO ARENA
          </p>
        </div>

        {/* Slot 1: DNA / Strategy */}
        <SlotPicker
          title="🧬 DNA — STRATEGY CORE"
          subtitle="How your agent thinks"
          options={DNA_OPTIONS}
          selected={config.dna}
          onSelect={(v) => updateConfig('dna', v as AgentConfig['dna'])}
        />

        {/* Slot 2: Data Source */}
        <SlotPicker
          title="📡 DATA SOURCE"
          subtitle="What your agent sees"
          options={DATA_OPTIONS}
          selected={config.dataSource}
          onSelect={(v) => updateConfig('dataSource', v as AgentConfig['dataSource'])}
        />

        {/* Slot 3: Time Horizon */}
        <SlotPicker
          title="⏱️ TIME HORIZON"
          subtitle="How fast your agent reacts"
          options={TIME_OPTIONS}
          selected={config.timeHorizon}
          onSelect={(v) => updateConfig('timeHorizon', v as AgentConfig['timeHorizon'])}
        />

        {/* Slot 4: Risk Profile */}
        <SlotPicker
          title="🛡️ RISK PROFILE"
          subtitle="How much your agent risks"
          options={RISK_OPTIONS}
          selected={config.risk}
          onSelect={(v) => updateConfig('risk', v as AgentConfig['risk'])}
          accentColor={riskColor}
        />

        {/* Slot 5: Special Ability */}
        <SlotPicker
          title="🔮 SPECIAL ABILITY"
          subtitle="Your agent's secret weapon"
          options={ABILITY_OPTIONS}
          selected={config.ability}
          onSelect={(v) => updateConfig('ability', v as AgentConfig['ability'])}
        />

        {/* Agent Name */}
        <HudFrame variant="cyan" title="AGENT IDENTITY" subtitle="NAME YOUR FIGHTER">
          <input
            type="text"
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            placeholder="e.g. NEON_REAPER_01"
            className="w-full px-4 py-3 rounded bg-[#0A0A0F] border border-[#1A2A1A] text-lg text-[#00E5FF] font-mono tracking-wider text-center focus:border-[#00E5FF] focus:outline-none focus:shadow-[0_0_20px_rgba(0,229,255,0.15)] placeholder-[#2A3A2A] transition-all uppercase"
          />
        </HudFrame>

        {/* Generate Button */}
        <div className="text-center">
          <button
            onClick={generateAgent}
            disabled={!agentName}
            className={`
              px-10 py-4 rounded font-mono text-base tracking-[0.2em] uppercase
              transition-all duration-500 overflow-hidden relative
              ${agentName
                ? 'border border-[#FFD700] text-[#FFD700] bg-[rgba(255,215,0,0.08)] hover:bg-[rgba(255,215,0,0.15)] hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] cursor-pointer animate-pulse-gold'
                : 'border border-[#1A2A1A]/50 text-[#2A3A2A] bg-[#0A0A0F] cursor-not-allowed opacity-40'
              }
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-xl">⚡</span>
              {agentName ? 'GENERATE AGENT' : 'NAME YOUR AGENT FIRST'}
              <span className="text-xl">⚡</span>
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </div>

        {/* Stats Preview */}
        {generated && stats && (
          <div className="animate-fade-in-up">
            <HudFrame variant="gold" title={`AGENT: ${agentName}`} subtitle="BACKTEST RESULTS" glowing>
              <div className="grid grid-cols-3 gap-4 text-center">
                <StatCard label="WIN RATE" value={`${stats.winRate}%`} color="#00FF41" />
                <StatCard label="SHARPE" value={stats.sharpe.toFixed(1)} color="#FFD700" />
                <StatCard label="TIER" value={stats.tier} color={riskColor} />
              </div>
              <div className="mt-4 pt-4 border-t border-[#1A2A1A]">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  {[
                    { label: 'DNA', value: DNA_OPTIONS.find(o=>o.id===config.dna)?.label },
                    { label: 'DATA', value: DATA_OPTIONS.find(o=>o.id===config.dataSource)?.label },
                    { label: 'HORIZON', value: config.timeHorizon?.toUpperCase() },
                    { label: 'RISK', value: RISK_OPTIONS.find(o=>o.id===config.risk)?.label },
                    { label: 'ABILITY', value: ABILITY_OPTIONS.find(o=>o.id===config.ability)?.label },
                  ].map(({ label, value }) => (
                    <div key={label} className="py-2 px-1 rounded bg-[#0A0A0F] border border-[#1A2A1A]">
                      <p className="text-[8px] text-[#4D754D] font-mono tracking-wider">{label}</p>
                      <p className="text-[10px] text-[#C0FFC0] font-mono mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center mt-4">
                <button className="px-6 py-2 rounded font-mono text-sm tracking-wider uppercase border border-[#00FF41]/30 text-[#00FF41] bg-[#0A1A0A]/50 hover:bg-[#0A1A0A] hover:shadow-[0_0_20px_rgba(0,255,65,0.3)] transition-all">
                  ◆ DEPLOY TO ARENA
                </button>
              </div>
            </HudFrame>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slot Picker Component ───
function SlotPicker({
  title, subtitle, options, selected, onSelect, accentColor
}: {
  title: string; subtitle: string;
  options: readonly { id: string; label: string; desc: string; icon: string; color?: string }[];
  selected: string;
  onSelect: (id: string) => void;
  accentColor?: string;
}) {
  return (
    <HudFrame variant="green" title={title} subtitle={subtitle}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map(opt => {
          const isSel = selected === opt.id;
          const glow = accentColor || '#00FF41';
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`
                text-left p-3 rounded border transition-all duration-300
                ${isSel
                  ? 'bg-[#0A1A0A] border-[#00FF41]/40 shadow-[0_0_15px_rgba(0,255,65,0.1)]'
                  : 'bg-[#0A0A0F] border-[#1A2A1A]/50 hover:border-[#00FF41]/20 hover:bg-[#0A1A0A]/30'
                }
              `}
              style={isSel ? { borderColor: glow, boxShadow: `0 0 15px ${glow}22` } : {}}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{opt.icon}</span>
                <span
                  className="text-[10px] font-mono tracking-wider"
                  style={{ color: isSel ? glow : '#4D754D' }}
                >
                  {opt.label}
                </span>
              </div>
              <p className="text-[9px] text-[#2A3A2A] font-mono leading-tight">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    </HudFrame>
  );
}

// ─── Stat Card ───
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="py-4 rounded border border-[#1A2A1A] bg-[#0A0A0F]">
      <p className="text-[8px] text-[#4D754D] font-mono tracking-[0.2em] uppercase">{label}</p>
      <p className="text-2xl font-mono font-bold mt-1 matrix-text" style={{ color }}>{value}</p>
    </div>
  );
}
