"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppStore } from "@/lib/store";
import { displayTone } from "@/lib/utils";

export default function EnsaiosPage() {
  const program = useAppStore((s) => s.program);
  const rehearsals = useAppStore((s) => s.rehearsals);
  const getSong = useAppStore((s) => s.getSong);
  const approveTone = useAppStore((s) => s.approveTone);
  const setRehearsalStatus = useAppStore((s) => s.setRehearsalStatus);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [toneInput, setToneInput] = useState("");

  return (
    <div>
      <PageHeader
        title="Ensaios"
        subtitle={`Programação · ${program.weekday} ${program.dateLabel}`}
      />
      <div className="px-4 py-4 space-y-3">
        {rehearsals.map((r, idx) => {
          const song = getSong(r.songId);
          const isEditing = editingId === r.id;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-white/8 bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white">{song?.name}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Solo: {r.solo}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <ToneCell label="Original" value={displayTone(r.tomOriginal)} />
                <ToneCell label="Ensaio" value={displayTone(r.tomEnsaio)} highlight />
                <ToneCell label="Aprovado" value={displayTone(r.tomAprovado)} />
              </div>

              {isEditing ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={toneInput}
                    onChange={(e) => setToneInput(e.target.value)}
                    placeholder="Ex: G, Am, D..."
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-neon-purple/50 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (toneInput.trim()) {
                        approveTone(r.id, toneInput.trim());
                      }
                      setEditingId(null);
                      setToneInput("");
                    }}
                    className="rounded-xl gradient-purple-pink px-4 text-sm font-bold text-white"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  {r.status !== "APROVADO" && (
                    <>
                      <button
                        onClick={() =>
                          setRehearsalStatus(r.id, "TESTANDO", r.tomEnsaio || undefined)
                        }
                        className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2 text-[11px] font-semibold text-cyan-300"
                      >
                        Testando
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(r.id);
                          setToneInput(r.tomEnsaio || "");
                        }}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl gradient-purple-pink py-2 text-[11px] font-bold text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Aprovar tom
                      </button>
                    </>
                  )}
                  {r.status === "APROVADO" && (
                    <p className="w-full text-center text-[11px] text-emerald-400">
                      Tom aprovado para o culto
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ToneCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 ${
        highlight
          ? "border-neon-purple/30 bg-violet-600/10"
          : "border-white/5 bg-black/30"
      }`}
    >
      <p className="text-[9px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p
        className={`mt-0.5 text-sm font-bold ${
          value === "PENDENTE" ? "text-amber-400/80" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
