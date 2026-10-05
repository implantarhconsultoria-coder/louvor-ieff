"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Music2,
  ExternalLink,
  Check,
  ClipboardPaste,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppStore } from "@/lib/store";
import { parseProgramacaoMessage } from "@/lib/parse-programacao";
import { displayTone } from "@/lib/utils";
import { getSongLinks } from "@/lib/song-links";
import type { ResolvedProgramItem } from "@/lib/types";

type Mode = "list" | "paste" | "review";

export default function ProgramacaoPage() {
  const program = useAppStore((s) => s.program);
  const getSong = useAppStore((s) => s.getSong);
  const live = useAppStore((s) => s.live);
  const pendingParsed = useAppStore((s) => s.pendingParsed);
  const setPendingParsed = useAppStore((s) => s.setPendingParsed);
  const confirmParsedProgram = useAppStore((s) => s.confirmParsedProgram);
  const chooseCandidate = useAppStore((s) => s.chooseCandidate);
  const enrichPending = useAppStore((s) => s.enrichPending);

  const [mode, setMode] = useState<Mode>("list");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  const items = [...program.items].sort((a, b) => a.position - b.position);

  // Enrich pending items with official Spotify/YouTube data when API keys exist.
  // Without keys the route answers configured:false and search links are kept.
  const enrichedKey = useRef<string>("");
  useEffect(() => {
    if (mode !== "review" || !pendingParsed?.length) return;
    const key = pendingParsed.map((p) => `${p.position}:${p.rawName}:${p.selectedCandidateId ?? ""}`).join("|");
    if (enrichedKey.current === key) return;
    enrichedKey.current = key;
    let cancelled = false;
    (async () => {
      for (const p of pendingParsed) {
        if (cancelled) return;
        if (p.matchStatus === "ambiguous" && !p.selectedCandidateId) continue;
        const song = p.matchedSongId ? getSong(p.matchedSongId) : undefined;
        if (song?.spotify?.trackId) continue;
        try {
          const qs = new URLSearchParams({ name: p.name });
          if (song?.artist) qs.set("artist", song.artist);
          const res = await fetch(`/api/song-refs?${qs.toString()}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (!data.configured?.spotify && !data.configured?.youtube) return;
          if (data.spotify || data.youtube) {
            enrichPending(p.position, { spotify: data.spotify, youtube: data.youtube ?? undefined });
          }
        } catch {
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, pendingParsed, getSong, enrichPending]);

  const handleParse = () => {
    const parsed = parseProgramacaoMessage(raw);
    if (!parsed.length) {
      setError("Não encontrei músicas na mensagem. Cole uma música por linha, ex.: Plano Melhor (Juliana)");
      return;
    }
    setError("");
    setPendingParsed(parsed);
    setMode("review");
  };

  const handleConfirm = () => {
    confirmParsedProgram();
    setRaw("");
    setMode("list");
  };

  return (
    <div>
      <PageHeader
        title="Programação"
        subtitle={`${program.weekday}, ${program.dateLabel} · ${items.length} louvores`}
        right={
          mode === "list" ? (
            <button
              onClick={() => setMode("paste")}
              className="flex h-9 items-center gap-1.5 rounded-full border border-neon-purple/40 bg-neon-purple/15 px-3 text-[11px] font-semibold text-violet-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("list");
                setPendingParsed(null);
                setError("");
              }}
              className="text-xs text-zinc-400"
            >
              Cancelar
            </button>
          )
        }
      />

      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          {mode === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {items.map((item, idx) => {
                const song = getSong(item.songId);
                const isNow = live.isLive && live.currentItemId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <div
                      className={`relative overflow-hidden rounded-2xl border bg-card p-4 ${
                        isNow
                          ? "border-neon-pink/50 glow-live"
                          : "border-white/8"
                      }`}
                    >
                      {isNow && (
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-600/15 to-violet-600/10 pointer-events-none" />
                      )}
                      <div className="relative flex gap-3">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-black/40">
                          <span className="text-lg font-black text-neon-purple">
                            {String(item.position).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {isNow && (
                                <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-neon-pink">
                                  <span className="h-1.5 w-1.5 rounded-full bg-neon-pink animate-live-pulse" />
                                  Agora
                                </span>
                              )}
                              <h3 className="truncate text-base font-bold text-white">
                                {song?.name ?? "Música"}
                              </h3>
                              <p className="mt-0.5 text-xs text-zinc-400">
                                Solo: {item.solo}
                              </p>
                            </div>
                            <Link href={`/musica/${item.songId}`}>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                className="rounded-full gradient-purple-pink px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white"
                              >
                                Abrir
                              </motion.button>
                            </Link>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                              Tom:{" "}
                              <span className="font-semibold text-zinc-200">
                                {displayTone(item.tone)}
                              </span>
                            </span>
                            <StatusBadge status={item.cifraStatus === "DISPONIVEL" ? "DISPONIVEL" : "PENDENTE"} />
                          </div>
                          <div className="mt-2 flex gap-3 text-[10px] text-zinc-600">
                            {song ? (
                              <a
                                href={getSongLinks(song).spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-zinc-500 hover:text-neon-purple"
                              >
                                <Music2 className="h-3 w-3" /> Ouvir
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 opacity-60">
                                <Music2 className="h-3 w-3" /> Ouvir
                              </span>
                            )}
                            <Link
                              href={`/musica/${item.songId}/cifra`}
                              className="flex items-center gap-1 text-zinc-500 hover:text-neon-purple"
                            >
                              <ExternalLink className="h-3 w-3" /> Cifra
                            </Link>
                            {song ? (
                              <a
                                href={getSongLinks(song).mainReference}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-500 hover:text-neon-purple"
                              >
                                Referência
                              </a>
                            ) : (
                              <span className="opacity-60">Referência</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {mode === "paste" && (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-neon-purple/30 bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-violet-300">
                  <ClipboardPaste className="h-4 w-4" />
                  <h2 className="text-sm font-bold">Nova Programação</h2>
                </div>
                <p className="mb-3 text-xs text-zinc-500">
                  Cole a mensagem do WhatsApp. Tons e cifras não serão inventados.
                </p>
                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={`Boa tarde pessoal, seguem os louvores:\nPlano Melhor (Juliana)\nVento do Espírito (Gabi)\nEscolhido (Henrique-Quezia)`}
                  rows={10}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-neon-purple/50 focus:outline-none"
                />
                {error && (
                  <p className="mt-2 text-xs text-amber-400">{error}</p>
                )}
                <button
                  onClick={handleParse}
                  className="mt-4 w-full rounded-xl gradient-purple-pink py-3 text-sm font-bold text-white shadow-neon"
                >
                  Revisar programação
                </button>
              </div>
            </motion.div>
          )}

          {mode === "review" && pendingParsed && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Programação identificada
              </p>
              <p className="text-xs text-zinc-500">
                Confira a ordem. Tom e cifra ficam PENDENTE até o ensaio.
              </p>
              {pendingParsed.map((p) => (
                <div
                  key={`${p.position}-${p.rawName}`}
                  className="rounded-xl border border-white/10 bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 text-sm font-bold text-violet-300">
                      {p.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-zinc-500">Solo: {p.solo}</p>
                    </div>
                    <StatusBadge status="PENDENTE" />
                  </div>
                  <ReviewStatus
                    item={p}
                    onChoose={(songId) => chooseCandidate(p.position, songId)}
                  />
                </div>
              ))}
              <button
                onClick={handleConfirm}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl gradient-purple-pink py-3.5 text-sm font-bold text-white shadow-neon"
              >
                <Check className="h-4 w-4" />
                Confirmar programação
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function isSearchUrl(url?: string | null): boolean {
  if (!url) return true;
  return /\/search|results\?search_query|[?&]q=/.test(url);
}

function LinkBadge({ label, href, linked }: { label: string; href: string; linked: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-neon-purple"
    >
      {linked ? <span className="font-semibold text-emerald-300">✓ {label}</span> : <>{label} · busca</>}
    </a>
  );
}

function ReviewStatus({
  item,
  onChoose,
}: {
  item: ResolvedProgramItem;
  onChoose: (songId: string | null) => void;
}) {
  const refs = item.externalRefs;
  const ytMain = refs.youtube.oficial ?? refs.youtube.ao_vivo ?? "";
  const isAmbiguous = item.matchStatus === "ambiguous";
  const picked = item.selectedCandidateId;

  return (
    <div className="mt-2 space-y-2 pl-12">
      {isAmbiguous ? (
        <div>
          <p className="text-[11px] text-amber-300">
            ⚠ Encontramos estas possíveis músicas — escolha uma:
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.candidates?.map((c) => (
              <button
                key={c.id}
                onClick={() => onChoose(c.id)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  picked === c.id
                    ? "border-neon-purple/50 bg-neon-purple/20 text-violet-200"
                    : "border-white/10 bg-white/5 text-zinc-400"
                }`}
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => onChoose(null)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                !picked
                  ? "border-neon-purple/50 bg-neon-purple/20 text-violet-200"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              Nenhuma — cadastrar como nova
            </button>
          </div>
        </div>
      ) : item.matchStatus === "found" ? (
        <p className="text-[11px] text-emerald-300">✓ Música encontrada</p>
      ) : (
        <p className="text-[11px] text-amber-300">⚠ Nova no repertório · referências encontradas</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <LinkBadge label="Spotify" href={refs.spotify} linked={Boolean(item.spotifyInfo?.trackId)} />
        <LinkBadge label="YouTube" href={ytMain} linked={!isSearchUrl(ytMain)} />
        <LinkBadge label="Cifra Club" href={refs.cifraClub} linked={!isSearchUrl(refs.cifraClub)} />
      </div>
    </div>
  );
}
