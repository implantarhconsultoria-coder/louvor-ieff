"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppStore } from "@/lib/store";
import { displayOrOmit, displayTone, formatDateBR, cn } from "@/lib/utils";
import type { SongFilter } from "@/lib/types";

const FILTERS: { id: SongFilter; label: string }[] = [
  { id: "TODAS", label: "Todas" },
  { id: "RECENTES", label: "Recentes" },
  { id: "MAIS_TOCADAS", label: "Mais tocadas" },
  { id: "NOVAS", label: "Novas" },
  { id: "PENDENTES", label: "Pendentes" },
];

export default function RepertorioPage() {
  const songs = useAppStore((s) => s.songs);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SongFilter>("TODAS");

  const filtered = useMemo(() => {
    let list = [...songs];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.lastSolo?.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case "RECENTES":
        list.sort((a, b) => (b.lastPlayed || "").localeCompare(a.lastPlayed || ""));
        break;
      case "MAIS_TOCADAS":
        list.sort((a, b) => b.timesPlayed - a.timesPlayed);
        break;
      case "NOVAS":
        list = list.filter((s) => s.isNew);
        break;
      case "PENDENTES":
        list = list.filter(
          (s) => s.cifraStatus === "PENDENTE" || !s.tone
        );
        break;
      default:
        list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    return list;
  }, [songs, query, filter]);

  return (
    <div>
      <PageHeader title="Repertório" subtitle={`${songs.length} músicas`} />
      <div className="px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar música, solo..."
            className="w-full rounded-2xl border border-white/10 bg-card py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-neon-purple/50 focus:outline-none focus:glow-purple"
          />
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all",
                filter === f.id
                  ? "gradient-purple-pink text-white shadow-neon"
                  : "border border-white/10 bg-white/5 text-zinc-400"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {filtered.map((song, idx) => {
            const artist = displayOrOmit(song.artist);
            const ref = displayOrOmit(song.reference);
            return (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              >
                <Link href={`/musica/${song.id}`}>
                  <div className="rounded-2xl border border-white/8 bg-card p-4 active:border-neon-purple/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-bold text-white">
                          {song.name}
                        </h3>
                        {(artist || ref) && (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {[artist, ref].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <StatusBadge
                        status={
                          song.cifraStatus === "DISPONIVEL"
                            ? "DISPONIVEL"
                            : "PENDENTE"
                        }
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                      <span>
                        Tom:{" "}
                        <strong className="text-zinc-300">
                          {displayTone(song.tone)}
                        </strong>
                      </span>
                      {song.lastPlayed && (
                        <span>Última: {formatDateBR(song.lastPlayed)}</span>
                      )}
                      {song.lastSolo && <span>Solo: {song.lastSolo}</span>}
                      <span>{song.timesPlayed}x</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          {!filtered.length && (
            <p className="py-12 text-center text-sm text-zinc-600">
              Nenhuma música encontrada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
