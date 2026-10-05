"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEMO_PROGRAM,
  MINISTER_PIN,
  NOTICES,
  REHEARSALS,
  SONGS,
} from "./demo-data";
import type {
  LiveSession,
  Notice,
  ParsedProgramItem,
  Program,
  ProgramItem,
  RehearsalItem,
  Song,
} from "./types";

interface AppState {
  songs: Song[];
  program: Program;
  rehearsals: RehearsalItem[];
  notices: Notice[];
  live: LiveSession;
  ministerAuthed: boolean;
  pendingParsed: ParsedProgramItem[] | null;

  getSong: (id: string) => Song | undefined;
  getProgramItem: (id: string) => ProgramItem | undefined;
  getCurrentLiveItem: () => ProgramItem | null;
  getNextLiveItem: () => ProgramItem | null;

  setMinisterAuthed: (ok: boolean) => void;
  verifyPin: (pin: string) => boolean;
  callNow: (itemId: string) => void;
  endLive: () => void;

  approveTone: (rehearsalId: string, tone: string) => void;
  setRehearsalStatus: (rehearsalId: string, status: RehearsalItem["status"], tomEnsaio?: string) => void;

  setPendingParsed: (items: ParsedProgramItem[] | null) => void;
  confirmParsedProgram: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      songs: SONGS,
      program: DEMO_PROGRAM,
      rehearsals: REHEARSALS,
      notices: NOTICES,
      live: { isLive: false, currentItemId: null, startedAt: null },
      ministerAuthed: false,
      pendingParsed: null,

      getSong: (id) => get().songs.find((s) => s.id === id),

      getProgramItem: (id) => get().program.items.find((i) => i.id === id),

      getCurrentLiveItem: () => {
        const { live, program } = get();
        if (!live.currentItemId) return null;
        return program.items.find((i) => i.id === live.currentItemId) ?? null;
      },

      getNextLiveItem: () => {
        const current = get().getCurrentLiveItem();
        const items = [...get().program.items].sort((a, b) => a.position - b.position);
        if (!current) return items[0] ?? null;
        const idx = items.findIndex((i) => i.id === current.id);
        return items[idx + 1] ?? null;
      },

      setMinisterAuthed: (ok) => set({ ministerAuthed: ok }),

      verifyPin: (pin) => {
        const ok = pin === MINISTER_PIN;
        if (ok) set({ ministerAuthed: true });
        return ok;
      },

      callNow: (itemId) =>
        set({
          live: {
            isLive: true,
            currentItemId: itemId,
            startedAt: new Date().toISOString(),
          },
        }),

      endLive: () =>
        set({
          live: { isLive: false, currentItemId: null, startedAt: null },
        }),

      approveTone: (rehearsalId, tone) =>
        set((state) => ({
          rehearsals: state.rehearsals.map((r) =>
            r.id === rehearsalId
              ? {
                  ...r,
                  tomAprovado: tone || null,
                  tomEnsaio: tone || r.tomEnsaio,
                  status: "APROVADO" as const,
                }
              : r
          ),
          program: {
            ...state.program,
            items: state.program.items.map((item) => {
              const reh = state.rehearsals.find((r) => r.id === rehearsalId);
              if (!reh || item.songId !== reh.songId) return item;
              return {
                ...item,
                tone: tone || null,
                status: "APROVADO" as const,
              };
            }),
          },
        })),

      setRehearsalStatus: (rehearsalId, status, tomEnsaio) =>
        set((state) => ({
          rehearsals: state.rehearsals.map((r) =>
            r.id === rehearsalId
              ? {
                  ...r,
                  status,
                  tomEnsaio: tomEnsaio !== undefined ? tomEnsaio : r.tomEnsaio,
                }
              : r
          ),
        })),

      setPendingParsed: (items) => set({ pendingParsed: items }),

      confirmParsedProgram: () => {
        const pending = get().pendingParsed;
        if (!pending?.length) return;

        const songs = [...get().songs];
        const items: ProgramItem[] = pending.map((p, idx) => {
          let song = songs.find(
            (s) => s.name.toLowerCase() === p.name.toLowerCase()
          );
          if (!song) {
            song = {
              id: `s-new-${Date.now()}-${idx}`,
              name: p.name,
              artist: null,
              reference: null,
              tone: null,
              cifraStatus: "PENDENTE",
              cifraContent: null,
              lyrics: null,
              listenUrl: null,
              timesPlayed: 0,
              lastPlayed: null,
              lastSolo: p.solo,
              isNew: true,
            };
            songs.push(song);
          }
          return {
            id: `pi-new-${Date.now()}-${idx}`,
            songId: song.id,
            position: p.position || idx + 1,
            solo: p.solo,
            tone: null,
            status: "PENDENTE",
            notes: null,
            cifraStatus: song.cifraStatus,
          };
        });

        const rehearsals: RehearsalItem[] = items.map((item) => ({
          id: `r-${item.id}`,
          songId: item.songId,
          solo: item.solo,
          tomOriginal: null,
          tomEnsaio: null,
          tomAprovado: null,
          status: "PENDENTE",
        }));

        set({
          songs,
          program: {
            ...get().program,
            id: `p-${Date.now()}`,
            title: "Nova Programação",
            items,
          },
          rehearsals,
          pendingParsed: null,
          live: { isLive: false, currentItemId: null, startedAt: null },
        });
      },
    }),
    {
      name: "louvor-ieff-store",
      partialize: (state) => ({
        program: state.program,
        songs: state.songs,
        rehearsals: state.rehearsals,
        live: state.live,
        ministerAuthed: state.ministerAuthed,
      }),
    }
  )
);
