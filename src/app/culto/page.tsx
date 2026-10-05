"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Radio, Mic, Music2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { displayTone } from "@/lib/utils";
import Link from "next/link";

export default function CultoPage() {
  const live = useAppStore((s) => s.live);
  const program = useAppStore((s) => s.program);
  const getSong = useAppStore((s) => s.getSong);
  const getCurrentLiveItem = useAppStore((s) => s.getCurrentLiveItem);
  const getNextLiveItem = useAppStore((s) => s.getNextLiveItem);

  const current = getCurrentLiveItem();
  const next = getNextLiveItem();
  const currentSong = current ? getSong(current.songId) : null;
  const nextSong = next ? getSong(next.songId) : null;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Ambient stage lights */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute top-1/3 -left-20 h-48 w-48 rounded-full bg-pink-600/15 blur-[80px]" />
        <div className="absolute bottom-1/4 -right-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-[70px]" />
      </div>

      <PageHeader
        title="Culto ao Vivo"
        subtitle={program.weekday + " · " + program.dateLabel}
        right={
          live.isLive ? (
            <span className="flex items-center gap-1.5 rounded-full border border-neon-pink/40 bg-neon-pink/15 px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-pink opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-pink" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neon-pink">
                Live
              </span>
            </span>
          ) : (
            <span className="text-[10px] text-zinc-600">Aguardando</span>
          )
        }
      />

      <div className="relative px-4 py-8">
        {/* Header indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Radio
            className={`h-4 w-4 ${
              live.isLive ? "text-neon-pink" : "text-zinc-600"
            }`}
          />
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.3em] ${
              live.isLive ? "text-neon-pink text-glow-pink" : "text-zinc-600"
            }`}
          >
            {live.isLive ? "Culto ao vivo" : "Culto — aguardando ministro"}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {current && currentSong ? (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-neon-pink/40 p-8 text-center glow-live">
                <div className="absolute inset-0 bg-gradient-to-b from-pink-600/25 via-violet-700/20 to-black/60" />
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-neon-pink text-glow-pink">
                    Agora
                  </p>
                  <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white drop-shadow-lg">
                    {currentSong.name}
                  </h2>
                  {current.chosenVersion && (
                    <a
                      href={current.chosenVersion.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-sm text-zinc-400"
                    >
                      {current.chosenVersion.artist} · Spotify ▶
                    </a>
                  )}
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Mic className="h-4 w-4 text-neon-cyan" />
                      <span className="text-base">
                        Solo:{" "}
                        <strong className="text-white">{current.solo}</strong>
                      </span>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2">
                      <Music2 className="h-3.5 w-3.5 text-neon-purple" />
                      <span className="text-sm text-zinc-400">Tom</span>
                      <span className="text-lg font-bold text-neon-cyan">
                        {displayTone(current.tone)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/musica/${currentSong.id}/cifra`}
                    className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-semibold text-white backdrop-blur-sm"
                  >
                    Abrir cifra
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-[2rem] border border-dashed border-white/10 bg-card/50 px-6 py-16 text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Radio className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-lg font-bold text-zinc-400">
                Nenhuma música chamada
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                O ministro usa o PIN e toca em &quot;Chamar agora&quot;.
              </p>
              <Link
                href="/ministro"
                className="mt-6 inline-flex rounded-full gradient-purple-pink px-5 py-2.5 text-xs font-bold text-white"
              >
                Ir para Modo Ministro
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Próxima */}
        {next && nextSong && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 rounded-2xl border border-white/8 bg-elevated/80 p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Próxima
            </p>
            <h3 className="mt-2 text-xl font-bold text-white">
              {nextSong.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">Solo: {next.solo}</p>
          </motion.div>
        )}

        {/* Mini playlist */}
        <div className="mt-8">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
            Programação
          </p>
          <div className="space-y-1.5">
            {[...program.items]
              .sort((a, b) => a.position - b.position)
              .map((item) => {
                const song = getSong(item.songId);
                const isNow = live.currentItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      isNow
                        ? "bg-pink-600/20 border border-neon-pink/30"
                        : "bg-transparent"
                    }`}
                  >
                    <span
                      className={`w-6 text-xs font-bold ${
                        isNow ? "text-neon-pink" : "text-zinc-600"
                      }`}
                    >
                      {String(item.position).padStart(2, "0")}
                    </span>
                    <span
                      className={`flex-1 truncate text-sm ${
                        isNow ? "font-bold text-white" : "text-zinc-500"
                      }`}
                    >
                      {song?.name}
                    </span>
                    {isNow && (
                      <span className="text-[9px] font-bold uppercase text-neon-pink">
                        Agora
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
