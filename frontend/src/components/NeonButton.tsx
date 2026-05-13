'use client';
interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: 'neon' | 'danger' | 'gold';
  className?: string;
}

export default function NeonButton({ onClick, disabled, loading, children, variant = 'neon', className = '' }: Props) {
  const base = 'px-6 py-2.5 rounded font-mono text-sm tracking-wider transition-all duration-200';
  const variants = {
    neon: 'btn-neon',
    danger: 'btn-neon btn-danger',
    gold: 'border-[#FFD700] text-[#FFD700] bg-[rgba(255,215,0,0.05)] hover:bg-[rgba(255,215,0,0.15)] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="matrix-spinner" />
          PROCESSING...
        </span>
      ) : children}
    </button>
  );
}
