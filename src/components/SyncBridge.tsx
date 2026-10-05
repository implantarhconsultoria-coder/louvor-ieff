"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { fetchLive, fetchRemote, subscribeRemote } from "@/lib/remote";
import { isRemoteEnabled } from "@/lib/supabase";

/**
 * Data-only bridge (renders nothing). With Supabase env:
 *  - on load: publishes pending local program, then hydrates from the latest remote program
 *  - Realtime: program/items/live changes refresh every phone instantly
 *  - polling fallback (live every 8s, full every 60s) if Realtime is blocked
 * Without env: does nothing → localStorage-only behavior.
 */
export function SyncBridge() {
  useEffect(() => {
    if (!isRemoteEnabled()) return;
    let alive = true;
    let fullTimer: ReturnType<typeof setTimeout> | null = null;

    const pullAll = async () => {
      const st = useAppStore.getState();
      if (st.unpublished && !st.publishing) await st.publishCurrent();
      const snap = await fetchRemote(useAppStore.getState().songs);
      if (alive && snap) useAppStore.getState().applyRemote(snap);
    };
    const pullLive = async () => {
      const live = await fetchLive();
      if (alive && live && live.programId && live.programId !== useAppStore.getState().program.id) {
        // Minister published/called on a program this phone doesn't have yet → full pull.
        await pullAll();
        return;
      }
      if (alive && live) {
        useAppStore.getState().applyRemoteLive(
          { isLive: live.isLive, currentItemId: live.currentItemId, startedAt: live.startedAt },
          live.programId
        );
      }
    };
    const schedulePullAll = () => {
      if (fullTimer) clearTimeout(fullTimer);
      fullTimer = setTimeout(() => void pullAll(), 800); // debounce bursts of item inserts
    };

    void pullAll();
    const unsubscribe = subscribeRemote((table) => {
      if (table === "live") void pullLive();
      else schedulePullAll();
    });

    const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
    const liveInterval = setInterval(() => visible() && void pullLive(), 8000);
    const fullInterval = setInterval(() => visible() && void pullAll(), 60000);
    const onVisible = () => visible() && void pullAll();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      unsubscribe();
      clearInterval(liveInterval);
      clearInterval(fullInterval);
      if (fullTimer) clearTimeout(fullTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
