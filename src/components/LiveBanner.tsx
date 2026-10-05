"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";

export function LiveBanner() {
  const pathname = usePathname();
  const live = useAppStore((s) => s.live);
  const getCurrent = useAppStore((s) => s.getCurrentLiveItem);
  const getSong = useAppStore((s) => s.getSong);

  if (!live.isLive || pathname === "/culto" || pathname?.includes("/cifra")) {
    return null;
  }

  const item = getCurrent();
  const song = item ? getSong(item.songId) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="sticky top-0 z-40 px-3 pt-2"
      >
        <Link
          href="/culto"
          className="flex items-center gap-3 rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 glow-pink"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-pink opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon-pink" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neon-pink">
              Ao vivo · Agora
            </p>
            <p className="truncate text-sm font-medium text-white">
              {song?.name ?? "Culto em andamento"}
            </p>
          </div>
          <span className="text-[10px] text-zinc-400">Ver →</span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
