"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Mic2,
  Radio,
  LogOut,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { displayTone } from "@/lib/utils";

export default function MinistroPage() {
  const ministerAuthed = useAppStore((s) => s.ministerAuthed);
  const verifyPin = useAppStore((s) => s.verifyPin);
  const setMinisterAuthed = useAppStore((s) => s.setMinisterAuthed);
  const program = useAppStore((s) => s.program);
  const getSong = useAppStore((s) => s.getSong);
  const live = useAppStore((s) => s.live);
  const callNow = useAppStore((s) => s.callNow);
  const endLive = useAppStore((s) => s.endLive);

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const items = [...program.items].sort((a, b) => a.position - b.position);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      if (verifyPin(next)) {
        setPin("");
      } else {
        setShake(true);
        setError("PIN incorreto");
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  if (!ministerAuthed) {
    return (
      <div className="flex min-h-dvh flex-col px-6 pt-8 pb-10">
        <Link
          href="/"
          className="mb-8 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
        >
          <ChevronLeft className="h-5 w-5 text-zinc-300" />
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl gradient-purple-pink shadow-neon">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Modo Ministro</h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Digite o PIN para comandar o culto ao vivo.
            <br />
            Apenas o ministro autenticado controla as telas.
          </p>

          <motion.div
            animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}}
            className="mt-8 flex gap-3"
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-3.5 w-3.5 rounded-full border ${
                  pin.length > i
                    ? "border-neon-pink bg-neon-pink shadow-neon-pink"
                    : "border-white/20 bg-transparent"
                }`}
              />
            ))}
          </motion.div>
          {error && (
            <p className="mt-3 text-xs text-amber-400">{error}</p>
          )}

          <div className="mt-10 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
              (key) => {
                if (key === "") return <div key="empty" />;
                return (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      key === "⌫" ? handleDelete() : handleDigit(key)
                    }
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-card text-xl font-semibold text-white active:bg-violet-600/30"
                  >
                    {key}
                  </motion.button>
                );
              }
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <header className="sticky top-0 z-30 glass border-b border-white/5 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <ChevronLeft className="h-5 w-5 text-zinc-300" />
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-neon-pink" />
              <h1 className="text-lg font-bold text-white">Modo Ministro</h1>
            </div>
            <p className="text-xs text-zinc-500">
              {program.weekday} · {program.dateLabel}
            </p>
          </div>
          <button
            onClick={() => setMinisterAuthed(false)}
            className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] text-zinc-400"
          >
            <LogOut className="h-3 w-3" /> Sair
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-neon-pink/30 bg-neon-pink/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-neon-pink" />
            <span className="text-xs font-semibold text-pink-200">
              {live.isLive ? "Culto ao vivo ativo" : "Aguardando chamada"}
            </span>
          </div>
          {live.isLive && (
            <button
              onClick={endLive}
              className="text-[10px] font-bold uppercase tracking-wide text-zinc-400"
            >
              Encerrar
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <p className="text-[11px] text-zinc-600">
          Toque em <strong className="text-zinc-400">Chamar agora</strong> para
          destacar a música em todas as telas.
        </p>

        <AnimatePresence>
          {items.map((item, idx) => {
            const song = getSong(item.songId);
            const isNow = live.currentItemId === item.id;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-2xl border p-4 ${
                  isNow
                    ? "border-neon-pink/50 bg-pink-600/15 glow-live"
                    : "border-white/8 bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black ${
                      isNow
                        ? "bg-neon-pink text-white"
                        : "bg-black/40 text-violet-300"
                    }`}
                  >
                    {String(item.position).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    {isNow && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neon-pink">
                        Agora no palco
                      </span>
                    )}
                    <h3 className="truncate font-bold text-white">
                      {song?.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Solo: {item.solo} · Tom: {displayTone(item.tone)}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => callNow(item.id)}
                  disabled={isNow}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${
                    isNow
                      ? "bg-white/10 text-zinc-500"
                      : "gradient-pink-violet text-white shadow-neon-pink"
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  {isNow ? "Em exibição" : "Chamar agora"}
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <Link
          href="/culto"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm text-zinc-400"
        >
          <Radio className="h-4 w-4" />
          Ver tela Ao Vivo
        </Link>
      </div>
    </div>
  );
}
