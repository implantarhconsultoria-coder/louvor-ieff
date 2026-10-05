"use client";

import { useEffect, useState } from "react";
import { SyncBridge } from "./SyncBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-neon-purple/40 border-t-neon-pink animate-spin" />
          <p className="text-xs tracking-[0.2em] text-zinc-500 uppercase">Louvor IEFF</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SyncBridge />
      {children}
    </>
  );
}
