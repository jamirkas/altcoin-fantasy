import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import CyberBackground from "@/components/CyberBackground";
import CodeRain from "@/components/CodeRain";

export const metadata: Metadata = {
  title: "Altcoin Fantasy — Beat the Benchmark",
  description: "Weekly crypto fantasy league. Draft altcoins, beat Bitcoin, win prizes.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>🏆</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased scanlines vignette">
        {/* Background layers */}
        <CyberBackground />
        <CodeRain />

        {/* Navigation */}
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
                { href: "/", label: "ARENA", icon: "◈" },
                { href: "/play", label: "PLAY", icon: "▶" },
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
          {/* Data stream line under nav */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#00FF41]/30 to-transparent" />
        </nav>

        {/* Main content */}
        <main className="pt-14 min-h-screen relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-[#1A2A1A]/50 py-4 px-4 text-center bg-[#050508]/90 backdrop-blur">
          <p className="text-[10px] text-[#4D754D] font-mono tracking-wider">
            CONTRACT: 0x6D61...aE05 • BASE SEPOLIA • {new Date().getFullYear()}
          </p>
          <p className="text-[8px] text-[#2A3A2A] font-mono mt-1">SYS.ONLINE // NODES: 12 // LAT: 0.04ms</p>
        </footer>
      </body>
    </html>
  );
}
