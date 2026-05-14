'use client';
interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: 'neon' | 'danger' | 'gold' | 'cyan';
  className?: string;
}

export default function NeonButton({ onClick, disabled, loading, children, variant = 'neon', className = '' }: Props) {
  const base = 'relative px-6 py-2.5 rounded font-mono text-sm tracking-[0.15em] uppercase transition-all duration-300 overflow-hidden';

  const variants: Record<string, string> = {
    neon: 'btn-neon',
    danger: 'btn-neon btn-danger',
    gold: 'border border-[#FFD700] text-[#FFD700] bg-[rgba(255,215,0,0.05)] hover:bg-[rgba(255,215,0,0.12)] hover:shadow-[0_0_25px_rgba(255,215,0,0.4),0_0_50px_rgba(255,215,0,0.15)] active:shadow-[0_0_15px_rgba(255,215,0,0.3)]',
    cyan: 'btn-neon btn-cyan',
  };

  const beforeAfter = variant === 'gold' ? "before:content-['[■_'] after:content-['_■]']" : variant === 'cyan' ? '' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${beforeAfter} ${className}`}
    >
      {/* Hover glow sweep */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      {loading ? (
        <span className="flex items-center gap-2 relative z-10">
          <span className="matrix-spinner w-4 h-4" />
          PROCESSING...
        </span>
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </button>
  );
}
