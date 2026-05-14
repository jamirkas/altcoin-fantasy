'use client';
interface Token {
  symbol: string;
  price: number;
  direction: 'LONG' | 'SHORT' | null;
}

interface Props {
  token: Token;
  isSelected: boolean;
  isCaptain: boolean;
  isLong: boolean;
  isShort: boolean;
  onToggle: (symbol: string, direction: 'LONG' | 'SHORT') => void;
  onMakeCaptain: (symbol: string) => void;
}

export default function TokenCard({ token, isSelected, isCaptain, isLong, isShort, onToggle, onMakeCaptain }: Props) {
  const baseClasses = 'p-3 rounded transition-all duration-300 relative overflow-hidden group';
  const selectedClasses = isCaptain
    ? 'bg-[#1A1A0A]/90 border border-[#FFD700]/40 neon-box-gold'
    : isLong
    ? 'bg-[#0A1A0A]/90 border border-[#00FF41]/30 neon-box'
    : isShort
    ? 'bg-[#1A0A0A]/90 border border-[#FF1A40]/30 neon-box-red'
    : 'bg-[#0A0A0F]/80 border border-[#1A2A1A]/50 hover:border-[#2A4A2A]/70 hover:bg-[#0F0F15]/80';

  const glowEffect = isSelected ? (isCaptain ? 'after:absolute after:inset-0 after:bg-[#FFD700]/5 after:rounded' : isLong ? 'after:absolute after:inset-0 after:bg-[#00FF41]/5 after:rounded' : 'after:absolute after:inset-0 after:bg-[#FF1A40]/5 after:rounded') : '';

  const priceStr = token.price > 0 
    ? `$${token.price.toFixed(token.price < 1 ? 4 : 2)}`
    : '...';

  return (
    <div
      className={`${baseClasses} ${glowEffect} ${isCaptain ? 'ring-1 ring-[#FFD700]/30' : ''}`}
    >
      {/* Captain star */}
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onMakeCaptain(token.symbol); }}
          className={`absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all z-10 ${
            isCaptain
              ? 'bg-[#FFD700] text-black shadow-[0_0_12px_rgba(255,215,0,0.6)] ring-pulse'
              : 'bg-[#1A2A1A] text-[#4D754D] hover:bg-[#FFD700]/60 hover:text-black hover:shadow-[0_0_8px_rgba(255,215,0,0.4)]'
          }`}
          title={isCaptain ? 'Captain (2x boost)' : 'Set as captain'}
        >
          ⚡
        </button>
      )}

      {/* Token name + price */}
      <div className="flex justify-between items-center mb-2.5 pr-7">
        <span className={`font-mono font-bold text-sm tracking-wider ${
          isCaptain ? 'text-[#FFD700]' : isSelected ? 'text-[#C0FFC0]' : 'text-[#8AAD8A]'
        }`}>
          {token.symbol}
        </span>
        <span className={`text-[10px] font-mono ${token.price > 0 ? 'text-[#4D754D]' : 'text-[#2A3A2A]'}`}>
          {priceStr}
        </span>
      </div>

      {/* LONG/SHORT buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onToggle(token.symbol, 'LONG')}
          className={`flex-1 px-2 py-1.5 text-[10px] rounded font-mono font-bold tracking-wider transition-all duration-200 ${
            isLong
              ? 'bg-[#00FF41] text-black shadow-[0_0_12px_rgba(0,255,65,0.3)]'
              : 'bg-[#0D0D0D] text-[#4D754D] border border-[#1A2A1A] hover:border-[#00FF41]/40 hover:text-[#00FF41] hover:bg-[#0A1A0A]'
          }`}
        >
          ▲ LONG
        </button>
        <button
          onClick={() => onToggle(token.symbol, 'SHORT')}
          className={`flex-1 px-2 py-1.5 text-[10px] rounded font-mono font-bold tracking-wider transition-all duration-200 ${
            isShort
              ? 'bg-[#FF1A40] text-white shadow-[0_0_12px_rgba(255,26,64,0.3)]'
              : 'bg-[#0D0D0D] text-[#4D754D] border border-[#1A2A1A] hover:border-[#FF1A40]/40 hover:text-[#FF1A40] hover:bg-[#1A0A0A]'
          }`}
        >
          ▼ SHORT
        </button>
      </div>
    </div>
  );
}
