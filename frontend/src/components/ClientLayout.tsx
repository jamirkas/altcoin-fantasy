'use client';
import { usePathname } from "next/navigation";
import Link from "next/link";
import CyberBackground from "@/components/CyberBackground";
import { WalletProvider } from "@/components/WalletContext";
import { ToastProvider } from "@/components/Toast";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <WalletProvider>
    <ToastProvider>
      {isLanding ? (
        /* Landing page — no nav, no HUD, just the page */
        <main className="min-h-screen relative z-10">
          {children}
        </main>
      ) : (
        /* dApp pages — full cyberpunk shell */
        <>
          <CyberBackground />
          <div className="ambient-orb ambient-orb-green" />
          <div className="ambient-orb ambient-orb-cyan" />
          <div className="hud-corner hud-corner-tl">SYS::ONLINE</div>
          <div className="hud-corner hud-corner-tr">NODE::SEPOLIA_01</div>

          <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[#1A2A1A]/50">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="matrix-text text-lg font-bold tracking-wider glitch" data-text="ALTCOIN_FANTASY">
                  ALTCOIN_FANTASY
                </span>
                <span className="text-[10px] text-[#4D754D] hidden sm:inline font-mono">// v2.0</span>
              </Link>
              <div className="flex gap-1 text-xs">
                {[
                  { href: "/arena", label: "ARENA", icon: "◈" },
                  { href: "/play", label: "PLAY", icon: "▶" },
                  { href: "/garage", label: "GARAGE", icon: "⚙" },
                  { href: "/leaderboard", label: "LEADERBOARD", icon: "▤" },
                  { href: "/profile", label: "PROFILE", icon: "◉" },
                ].map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="px-3 py-1.5 text-[#4D754D] hover:text-[#00FF41] hover:bg-[#0A1A0A]/50 rounded transition-all font-mono tracking-wider border border-transparent hover:border-[#1A2A1A]/50"
                  >
                    <span className="hidden sm:inline">{icon} </span>{label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/30 to-transparent" />
          </nav>

          <main className="pt-14 min-h-screen relative z-10">
            {children}
          </main>

          <footer className="relative z-10 border-t border-[#1A2A1A]/50 py-4 px-4 text-center bg-[#050508]/90 backdrop-blur">
            <p className="text-[10px] text-[#4D754D] font-mono tracking-wider">
              CONTRACT: 0x4133...1B81 • BASE SEPOLIA • 2026
            </p>
            <p className="text-[8px] text-[#2A3A2A] font-mono mt-1">SYS.ONLINE // NODES: 12 // LAT: 0.04ms</p>
          </footer>
        </>
      )}
    </ToastProvider>
    </WalletProvider>
  );
}
