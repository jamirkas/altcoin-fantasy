import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Altcoin Fantasy — Beat the Benchmark",
  description: "Weekly crypto fantasy league. Draft altcoins, beat Bitcoin, win prizes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
