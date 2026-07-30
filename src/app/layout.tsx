import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "India in the World — Global Progress Dashboard",
  description:
    "Track India's rankings across 80+ global indicators: economy, health, education, environment, governance, technology, and more. Sourced from World Bank, WHO, UNDP, ITU, and other trusted public datasets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight hover:text-amber-600">
              India Dashboard
            </Link>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <Link href="/country/IND" className="hover:text-foreground">India</Link>
              <Link href="/explore" className="hover:text-foreground">Explore</Link>
              <Link href="/compare" className="hover:text-foreground">Compare</Link>
              <Link href="/report-card" className="hover:text-foreground">Report Card</Link>
              <Link href="/chat" className="hover:text-foreground">Ask AI</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
