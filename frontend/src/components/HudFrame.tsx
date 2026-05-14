'use client';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'green' | 'cyan' | 'gold' | 'red';
  className?: string;
  glowing?: boolean;
}

export default function HudFrame({ children, title, subtitle, variant = 'green', className = '', glowing = false }: Props) {
  const borderColors: Record<string, string> = {
    default: 'border-[#1A2A1A]',
    green: 'border-[#1A3A1A]',
    cyan: 'border-[#1A3A3A]',
    gold: 'border-[#3A3A1A]',
    red: 'border-[#3A1A1A]',
  };

  const accentColors: Record<string, string> = {
    default: 'text-[#00FF41] border-[#00FF41]',
    green: 'text-[#00FF41] border-[#00FF41]',
    cyan: 'text-[#00E5FF] border-[#00E5FF]',
    gold: 'text-[#FFD700] border-[#FFD700]',
    red: 'text-[#FF1A40] border-[#FF1A40]',
  };

  const neonClass = variant === 'gold' ? 'neon-box-gold' : variant === 'red' ? 'neon-box-red' : variant === 'cyan' ? 'neon-box-cyan' : 'neon-box';

  return (
    <div className={`relative ${className}`}>
      {/* Corner brackets */}
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${accentColors[variant]} opacity-60`} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${accentColors[variant]} opacity-60`} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${accentColors[variant]} opacity-60`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${accentColors[variant]} opacity-60`} />

      {/* Main panel */}
      <div className={`mx-[3px] my-[3px] p-4 rounded-sm ${neonClass} ${glowing ? 'neon-pulse' : ''} bg-[#0A0A0F]/90 border ${borderColors[variant]} ${glowing ? 'border-animated' : ''}`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1A2A1A]">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${variant === 'gold' ? 'bg-[#FFD700]' : variant === 'cyan' ? 'bg-[#00E5FF]' : variant === 'red' ? 'bg-[#FF1A40]' : 'bg-[#00FF41]'}`} />
              <span className={`text-[10px] font-mono tracking-[0.2em] uppercase ${accentColors[variant]}`}>{title}</span>
            </div>
            {subtitle && (
              <span className="text-[9px] text-[#4D754D] font-mono">{subtitle}</span>
            )}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
