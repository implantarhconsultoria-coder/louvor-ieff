"use client";

import { BottomNav } from "./BottomNav";
import { LiveBanner } from "./LiveBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-phone relative">
      <LiveBanner />
      <main className="safe-bottom min-h-dvh">{children}</main>
      <BottomNav />
    </div>
  );
}
