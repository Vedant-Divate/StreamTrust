import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { COPY } from "@/domain/copy";
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
  title: "StreamTrust",
  description: "AI-assisted, human-verified stream assessments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <header className="border-b border-border bg-card">
          <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 rounded font-display text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <svg
                width="28"
                height="20"
                viewBox="0 0 28 20"
                fill="none"
                aria-hidden="true"
                className="text-primary"
              >
                <path
                  d="M2 5q3-3 6 0t6 0t6 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M5 10.5q3-3 6 0t6 0t6 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <path
                  d="M2 16q3-3 6 0t6 0t6 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.35"
                />
              </svg>
              {COPY.appName}
            </Link>
            <Link
              href="/about"
              className="min-h-[44px] inline-flex items-center rounded px-3 text-sm underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {COPY.learnMore}
            </Link>
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t-2 border-primary/30 bg-card">
          <p className="mx-auto w-full max-w-2xl px-4 py-4 text-sm leading-relaxed">
            {COPY.disclaimerMonitoringOnly} {COPY.disclaimerAiCanBeWrong}
          </p>
        </footer>
      </body>
    </html>
  );
}
