import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Vibe Music | 석이의 뮤직플레이어",
  description: "Spotify 메타데이터와 AI 큐레이션을 결합한 프리미엄 뮤직플레이어",
};

import { Sidebar } from "../components/Sidebar";
import { BottomPlayer } from "../components/BottomPlayer";
import { LyricsPanel } from "../components/LyricsPanel";

import { Providers } from "../components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${outfit.variable} font-sans antialiased bg-background text-white min-h-screen flex overflow-hidden`}>
        <Providers>
          <div className="flex-1 flex flex-col relative overflow-hidden h-screen">
            <main className="flex-1 overflow-y-auto pb-32">
              {children}
            </main>
            <BottomPlayer />
            <LyricsPanel />
          </div>
        </Providers>
      </body>
    </html>
  );
}
