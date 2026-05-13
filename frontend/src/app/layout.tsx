import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Altcoin Fantasy — Beat the Benchmark",
  description: "Weekly crypto fantasy league. Draft altcoins, beat Bitcoin, win prizes.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>🏆</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased scanlines">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1A3A1A] bg-[#0A0A0A]/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="matrix-text text-lg font-bold tracking-wider glitch">
                ALTCOIN_FANTASY
              </span>
              <span className="text-[10px] text-[#4D804D] hidden sm:inline">// v2.0</span>
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
                  className="px-3 py-1.5 text-[#4D804D] hover:text-[#00FF41] hover:bg-[#0D1A0D] rounded transition-colors font-mono tracking-wider"
                >
                  <span className="hidden sm:inline">{icon} </span>{label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="pt-14 min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#1A3A1A] py-3 px-4 text-center">
          <p className="text-[10px] text-[#4D804D] font-mono">
            CONTRACT: 0x6D61...aE05 • BASE SEPOLIA • {new Date().getFullYear()}
          </p>
        </footer>
      </body>
    </html>
  );
}
