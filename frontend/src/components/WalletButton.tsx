'use client';
import { useWallet } from '@/components/WalletContext';

export default function WalletButton() {
  const { account, isCorrectChain, connecting, connect } = useWallet();

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={connect}
        disabled={connecting}
        className={`
          relative px-5 py-2.5 rounded font-mono text-sm tracking-[0.12em] uppercase
          transition-all duration-300 overflow-hidden
          ${account && isCorrectChain
            ? 'border border-[#00FF41]/50 text-[#00FF41] bg-[#0A1A0A]/60 hover:bg-[#0A1A0A]/80 hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]'
            : account && !isCorrectChain
            ? 'border border-[#FF1A40]/50 text-[#FF1A40] bg-[#1A0A0A]/60 animate-pulse'
            : 'btn-neon futuristic-btn'
          }
        `}
      >
        {/* Scanning line effect */}
        {!account && (
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00FF41]/10 to-transparent -translate-x-full animate-scan" />
        )}

        {/* Power indicator */}
        <span className="flex items-center gap-2 relative z-10">
          {connecting ? (
            <>
              <span className="matrix-spinner w-3.5 h-3.5" />
              CONNECTING...
            </>
          ) : account ? (
            <>
              <span className={`w-1.5 h-1.5 rounded-full ${isCorrectChain ? 'bg-[#00FF41] shadow-[0_0_6px_#00FF41]' : 'bg-[#FF1A40] shadow-[0_0_6px_#FF1A40]'}`} />
              {account.slice(0, 6)}...{account.slice(-4)}
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4D754D]" />
              CONNECT WALLET
            </>
          )}
        </span>
      </button>

      {/* Status indicator */}
      {account && !isCorrectChain && (
        <span className="text-[10px] text-[#FF1A40] font-mono tracking-wider animate-pulse">
          ⚠ WRONG NETWORK — SWITCH TO BASE SEPOLIA
        </span>
      )}
      {account && isCorrectChain && (
        <span className="text-[10px] text-[#00FF41] font-mono tracking-wider">
          ◈ BASE SEPOLIA
        </span>
      )}
    </div>
  );
}
