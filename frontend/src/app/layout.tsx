import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "MechLeague — On-chain Mech Battler",
  description: "Build AI mechs, challenge players, climb the leaderboard. Token prices modulate ability strength. On-chain fantasy league on Base.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>🏆</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased scanlines vignette">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
