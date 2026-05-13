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
  const borderClass = isCaptain
    ? 'border-[#FFD700] bg-[#1A1A0A] neon-box-gold'
    : isLong
    ? 'border-[#00FF41] bg-[#0A1A0A] neon-box'
    : isShort
    ? 'border-[#FF1A40] bg-[#1A0A0A] neon-box-red'
    : 'border-[#1A3A1A] bg-[#0D0D0D] hover:border-[#2A5A2A]';

  return (
    <div className={`p-3 rounded border transition-all relative ${borderClass}`}>
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onMakeCaptain(token.symbol); }}
          className={`absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full text-xs transition ${
            isCaptain ? 'bg-[#FFD700] text-black' : 'bg-[#1A3A1A] text-[#4D804D] hover:bg-[#FFD700]/60'
          }`}
          title={isCaptain ? 'Captain' : 'Make captain'}
        >
          ⚡
        </button>
      )}
      <div className="flex justify-between items-center mb-2 pr-6">
        <span className={`font-mono font-bold text-sm ${isCaptain ? 'text-[#FFD700]' : ''}`}>
          {token.symbol}
        </span>
        <span className="text-xs text-[#4D804D] font-mono">
          ${token.price.toFixed(token.price < 1 ? 4 : 2)}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onToggle(token.symbol, 'LONG')}
          className={`flex-1 px-2 py-1 text-xs rounded font-mono font-bold transition ${
            isLong
              ? 'bg-[#00FF41] text-black'
              : 'bg-[#0D0D0D] text-[#4D804D] border border-[#1A3A1A] hover:border-[#00FF41]/50 hover:text-[#00FF41]'
          }`}
        >
          LONG
        </button>
        <button
          onClick={() => onToggle(token.symbol, 'SHORT')}
          className={`flex-1 px-2 py-1 text-xs rounded font-mono font-bold transition ${
            isShort
              ? 'bg-[#FF1A40] text-white'
              : 'bg-[#0D0D0D] text-[#4D804D] border border-[#1A3A1A] hover:border-[#FF1A40]/50 hover:text-[#FF1A40]'
          }`}
        >
          SHORT
        </button>
      </div>
    </div>
  );
}
