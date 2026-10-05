"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Minus,
  Plus,
  ArrowUpDown,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { displayTone } from "@/lib/utils";
import { getSongLinks } from "@/lib/song-links";

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function CifraPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const getSong = useAppStore((s) => s.getSong);
  const program = useAppStore((s) => s.program);
  const song = getSong(id);
  const programItem = program.items.find((i) => i.songId === id);

  const baseTone = programItem?.tone ?? song?.tone ?? null;
  const [fontSize, setFontSize] = useState(18);
  const [capo, setCapo] = useState(0);
  const [keyOffset, setKeyOffset] = useState(0);

  if (!song) {
    return (
      <div className="p-6 text-center text-zinc-500">Música não encontrada.</div>
    );
  }

  const hasRealCifra = Boolean(song.cifraContent);
  const displayKey = (() => {
    if (!baseTone) return "PENDENTE";
    const idx = KEYS.findIndex(
      (k) => k.toLowerCase() === baseTone.replace("m", "").toLowerCase()
    );
    if (idx < 0) return baseTone;
    const isMinor = /m$/i.test(baseTone);
    const next = KEYS[(idx + keyOffset + 12 * 10) % 12];
    return isMinor ? `${next}m` : next;
  })();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-deep">
      <header className="shrink-0 border-b border-white/5 bg-black/80 px-3 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-phone items-center gap-2">
          <Link href={`/musica/${id}`}>
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5"
            >
              <ChevronLeft className="h-5 w-5 text-zinc-300" />
            </motion.div>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-white">{song.name}</h1>
            <p className="text-[10px] text-zinc-500">
              Solo: {programItem?.solo ?? "—"} · Tom: {displayTone(baseTone)}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-2 flex max-w-phone flex-wrap items-center gap-2 px-1 pb-1">
          <ControlGroup label="Fonte">
            <IconBtn onClick={() => setFontSize((f) => Math.max(14, f - 2))}>
              <Minus className="h-3.5 w-3.5" />
            </IconBtn>
            <span className="w-8 text-center text-xs text-zinc-400">{fontSize}</span>
            <IconBtn onClick={() => setFontSize((f) => Math.min(32, f + 2))}>
              <Plus className="h-3.5 w-3.5" />
            </IconBtn>
          </ControlGroup>

          <ControlGroup label="Tom">
            <IconBtn onClick={() => setKeyOffset((k) => k - 1)}>
              <ArrowUpDown className="h-3.5 w-3.5 rotate-180" />
            </IconBtn>
            <span className="min-w-[3rem] text-center text-xs font-bold text-neon-cyan">
              {displayKey}
            </span>
            <IconBtn onClick={() => setKeyOffset((k) => k + 1)}>
              <ArrowUpDown className="h-3.5 w-3.5" />
            </IconBtn>
          </ControlGroup>

          <ControlGroup label="Capo">
            <IconBtn onClick={() => setCapo((c) => Math.max(0, c - 1))}>
              <Minus className="h-3.5 w-3.5" />
            </IconBtn>
            <span className="w-6 text-center text-xs text-zinc-300">{capo}</span>
            <IconBtn onClick={() => setCapo((c) => Math.min(7, c + 1))}>
              <Plus className="h-3.5 w-3.5" />
            </IconBtn>
          </ControlGroup>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-phone">
          {!hasRealCifra ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-amber-400"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="text-xl font-bold text-white">Cifra pendente</p>
              <p className="mt-2 max-w-xs text-sm text-zinc-500">
                Ainda não há cifra cadastrada para esta música. Não inventamos acordes.
              </p>
              <a
                href={getSongLinks(song).cifraClubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 rounded-full gradient-purple-pink px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white"
              >
                Cifra Club · Abrir cifra
              </a>
              <p className="mt-6 text-xs text-zinc-600">
                Tom exibido: <span className="text-zinc-400">{displayKey}</span>
                {capo > 0 && <> · Capo {capo}</>}
              </p>
            </div>
          ) : (
            <pre
              className="cifra-stage text-zinc-100"
              style={{ fontSize: `${fontSize}px` }}
            >
              {song.cifraContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1">
      <span className="mr-1 text-[9px] uppercase tracking-wider text-zinc-600">
        {label}
      </span>
      {children}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-300 active:bg-white/10"
    >
      {children}
    </button>
  );
}
