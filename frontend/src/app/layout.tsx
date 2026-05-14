import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "Altcoin Fantasy — Beat the Benchmark",
  description: "Weekly crypto fantasy league. Draft altcoins, beat Bitcoin, win prizes.",
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
