"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { isUuid, songToRow } from "@/lib/sync-mapping";
import type { ProgramItem, Song } from "@/lib/types";
import { displayTone } from "@/lib/utils";

function itemIdFromRehearsal(rehearsalId: string): string {
  return rehearsalId.startsWith("r-") ? rehearsalId.slice(2) : rehearsalId;
}

async function persistRehearsalEdit(itemId: string, song: Song, solo: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !isUuid(itemId)) return true;

  const { data: songRow, error: songError } = await sb
    .from("louvor_songs")
    .upsert(songToRow(song), { onConflict: "client_key" })
    .select("id")
    .single();

  if (songError || !songRow?.id) return false;

  const { error: itemError } = await sb
    .from("louvor_program_items")
    .update({ song_id: songRow.id, solo })
    .eq("id", itemId);

  return !itemError;
}

async function persistRehearsalDelete(
  itemId: string,
  remaining: ProgramItem[]
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !isUuid(itemId)) return true;

  const { error } = await sb.from("louvor_program_items").delete().eq("id", itemId);
  if (error) return false;

  for (const item of remaining) {
    if (!isUuid(item.id)) continue;
    const { error: positionError } = await sb
      .from("louvor_program_items")
      .update({ position: item.position })
      .eq("id", item.id);
    if (positionError) return false;
  }

  return true;
}

export default function EnsaiosPage() {
  const program = useAppStore((s) => s.program);
  const rehearsals = useAppStore((s) => s.rehearsals);
  const getSong = useAppStore((s) => s.getSong);
  const approveTone = useAppStore((s) => s.approveTone);
  const setRehearsalStatus = useAppStore((s) => s.setRehearsalStatus);

  const [toneEditingId, setToneEditingId] = useState<string | null>(null);
  const [toneInput, setToneInput] = useState("");
  const [songEditingId, setSongEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [soloInput, setSoloInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startSongEdit = (rehearsalId: string, song: Song | undefined, solo: string) => {
    if (!song) return;
    setSongEditingId(rehearsalId);
    setNameInput(song.name);
    setSoloInput(solo === "PENDENTE" ? "" : solo);
  };

  const cancelSongEdit = () => {
    setSongEditingId(null);
    setNameInput("");
    setSoloInput("");
  };

  const saveSongEdit = async (rehearsalId: string, song: Song | undefined) => {
    if (!song) return;
    const name = nameInput.trim();
    if (!name) return;

    const solo = soloInput.trim() || "PENDENTE";
    const itemId = itemIdFromRehearsal(rehearsalId);
    const nextSong: Song = { ...song, name, lastSolo: solo };

    setSavingId(rehearsalId);
    const ok = await persistRehearsalEdit(itemId, nextSong, solo);
    setSavingId(null);

    if (!ok) {
      window.alert("Não foi possível salvar a alteração. Tente novamente.");
      return;
    }

    useAppStore.setState((state) => ({
      songs: state.songs.map((s) => (s.id === song.id ? nextSong : s)),
      program: {
        ...state.program,
        items: state.program.items.map((item) =>
          item.id === itemId ? { ...item, solo } : item
        ),
      },
      rehearsals: state.rehearsals.map((r) =>
        r.id === rehearsalId ? { ...r, solo } : r
      ),
    }));

    cancelSongEdit();
  };

  const removeSong = async (rehearsalId: string) => {
    if (!window.confirm("Deseja remover esta música deste ensaio?")) return;

    const itemId = itemIdFromRehearsal(rehearsalId);
    const state = useAppStore.getState();

    if (state.live.isLive && state.live.currentItemId === itemId) {
      window.alert("Encerre o Ao Vivo antes de excluir a música que está sendo chamada.");
      return;
    }

    const remaining = state.program.items
      .filter((item) => item.id !== itemId)
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({ ...item, position: index + 1 }));

    setDeletingId(rehearsalId);
    const ok = await persistRehearsalDelete(itemId, remaining);
    setDeletingId(null);

    if (!ok) {
      window.alert("Não foi possível excluir a música. Tente novamente.");
      return;
    }

    useAppStore.setState((current) => ({
      program: { ...current.program, items: remaining },
      rehearsals: current.rehearsals.filter((r) => r.id !== rehearsalId),
    }));

    if (songEditingId === rehearsalId) cancelSongEdit();
    if (toneEditingId === rehearsalId) {
      setToneEditingId(null);
      setToneInput("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Ensaios"
        subtitle={`Programação · ${program.weekday} ${program.dateLabel}`}
      />
      <div className="px-4 py-4 space-y-3">
        {rehearsals.map((r, idx) => {
          const song = getSong(r.songId);
          const isToneEditing = toneEditingId === r.id;
          const isSongEditing = songEditingId === r.id;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-white/8 bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-white">{song?.name}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Solo: {r.solo}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startSongEdit(r.id, song, r.solo)}
                    disabled={savingId === r.id || deletingId === r.id}
                    title="Editar música"
                    aria-label="Editar música"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 transition hover:text-white disabled:opacity-40"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSong(r.id)}
                    disabled={savingId === r.id || deletingId === r.id}
                    title="Excluir música"
                    aria-label="Excluir música"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <StatusBadge status={r.status} />
                </div>
              </div>

              {isSongEditing && (
                <div className="mt-3 space-y-2 rounded-xl border border-white/8 bg-black/20 p-3">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Nome da música"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-neon-purple/50 focus:outline-none"
                    autoFocus
                  />
                  <input
                    value={soloInput}
                    onChange={(e) => setSoloInput(e.target.value)}
                    placeholder="Solo (opcional)"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-neon-purple/50 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelSongEdit}
                      disabled={savingId === r.id}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/10 py-2 text-[11px] font-semibold text-zinc-300 disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSongEdit(r.id, song)}
                      disabled={!nameInput.trim() || savingId === r.id}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl gradient-purple-pink py-2 text-[11px] font-bold text-white disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {savingId === r.id ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <ToneCell label="Original" value={displayTone(r.tomOriginal)} />
                <ToneCell label="Ensaio" value={displayTone(r.tomEnsaio)} highlight />
                <ToneCell label="Aprovado" value={displayTone(r.tomAprovado)} />
              </div>

              {isToneEditing ? (
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
                      setToneEditingId(null);
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
                          setToneEditingId(r.id);
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
