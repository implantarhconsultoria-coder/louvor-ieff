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
  ResolvedProgramItem,
  Song,
  SpotifyInfo,
  YoutubeRole,
} from "./types";
import { resolveAll } from "./resolve-song";
import { normalizeSongName } from "./normalize";

interface AppState {
  songs: Song[];
  program: Program;
  rehearsals: RehearsalItem[];
  notices: Notice[];
  live: LiveSession;
  ministerAuthed: boolean;
  pendingParsed: ResolvedProgramItem[] | null;
  /** normalized parsed name → repertoire song id (learned from user picks). */
  learnedMatches: Record<string, string>;

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
  /** Ambiguous pick: songId of repertoire song, or null = cadastrar como nova. */
  chooseCandidate: (position: number, songId: string | null) => void;
  /** Merge API-enriched refs (Spotify/YouTube) into a pending item. */
  enrichPending: (
    position: number,
    data: { spotify?: SpotifyInfo | null; youtube?: Partial<Record<YoutubeRole, string>> }
  ) => void;
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
      learnedMatches: {},

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

      setPendingParsed: (items) =>
        set({
          pendingParsed: items
            ? resolveAll(items, get().songs, get().learnedMatches)
            : null,
        }),

      chooseCandidate: (position, songId) =>
        set((state) => {
          const pending = state.pendingParsed;
          if (!pending) return {};
          const target = pending.find((p) => p.position === position);
          if (!target) return {};
          const learned = { ...state.learnedMatches };
          const key = normalizeSongName(target.rawName);
          if (songId) learned[key] = songId;
          else delete learned[key];
          const song = songId ? state.songs.find((s) => s.id === songId) : undefined;
          return {
            learnedMatches: learned,
            pendingParsed: pending.map((p) =>
              p.position === position
                ? {
                    ...p,
                    selectedCandidateId: songId,
                    matchedSongId: songId,
                    name: song?.name ?? p.rawName,
                  }
                : p
            ),
          };
        }),

      enrichPending: (position, data) =>
        set((state) => ({
          pendingParsed:
            state.pendingParsed?.map((p) =>
              p.position === position
                ? {
                    ...p,
                    spotifyInfo: data.spotify ?? p.spotifyInfo ?? null,
                    externalRefs: {
                      ...p.externalRefs,
                      spotify: data.spotify?.url ?? p.externalRefs.spotify,
                      youtube: { ...p.externalRefs.youtube, ...(data.youtube ?? {}) },
                    },
                  }
                : p
            ) ?? null,
        })),

      confirmParsedProgram: () => {
        const pending = get().pendingParsed;
        if (!pending?.length) return;

        const songs = [...get().songs];
        const stamp = Date.now();
        const items: ProgramItem[] = pending.map((p, idx) => {
          // Only bind to repertoire when confident or user-picked (never auto-bind ambiguous).
          const boundId = p.selectedCandidateId ?? p.matchedSongId;
          let songIdx = boundId ? songs.findIndex((s) => s.id === boundId) : -1;

          // Same nova title twice in one message → reuse the same song entity.
          if (songIdx < 0 && p.matchStatus !== "ambiguous") {
            const key = normalizeSongName(p.rawName);
            songIdx = songs.findIndex((s) => normalizeSongName(s.name) === key);
          }

          const refs = p.externalRefs;
          if (songIdx < 0) {
            const song: Song = {
              id: `s-new-${stamp}-${idx}`,
              name: p.rawName,
              artist: p.spotifyInfo?.trackId ? p.spotifyInfo.artist : null,
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
              spotify: p.spotifyInfo ?? { trackId: null, url: refs.spotify, artist: null, album: null, coverUrl: null, durationMs: null },
              youtube: refs.youtube,
              cifraClub: refs.cifraClub,
              instruments: null,
              defaultChoice: null,
            };
            songs.push(song);
            songIdx = songs.length - 1;
          } else {
            // Attach refs to the SAME song entity — only fill what's missing.
            const s0 = songs[songIdx];
            songs[songIdx] = {
              ...s0,
              lastSolo: p.solo !== "PENDENTE" ? p.solo : s0.lastSolo,
              spotify:
                s0.spotify?.trackId
                  ? s0.spotify
                  : p.spotifyInfo ?? s0.spotify ?? { trackId: null, url: refs.spotify, artist: null, album: null, coverUrl: null, durationMs: null },
              youtube: { ...refs.youtube, ...(s0.youtube ?? {}) },
              cifraClub: s0.cifraClub || refs.cifraClub,
              defaultChoice:
                p.selectedCandidateId && p.matchStatus === "ambiguous"
                  ? { ...(s0.defaultChoice ?? {}), externalKey: normalizeSongName(p.rawName) }
                  : s0.defaultChoice ?? null,
            };
          }

          const song = songs[songIdx];
          return {
            id: `pi-new-${stamp}-${idx}`,
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
            id: `p-${stamp}`,
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
        learnedMatches: state.learnedMatches,
      }),
    }
  )
);
