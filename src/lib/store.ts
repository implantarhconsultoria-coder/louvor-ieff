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
  SongVersion,
  SpotifyInfo,
  YoutubeRole,
} from "./types";
import { resolveAll } from "./resolve-song";
import { normalizeSongName } from "./normalize";
import { addToHistory, mergeVersions } from "./versions";
import { publishProgram, pushItemTone, pushLive, type RemoteSnapshot } from "./remote";

function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function rehearsalsFor(items: ProgramItem[], prev: RehearsalItem[] = []): RehearsalItem[] {
  return items.map((item) => {
    const old = prev.find((r) => r.id === `r-${item.id}`);
    return {
      id: `r-${item.id}`,
      songId: item.songId,
      solo: item.solo,
      tomOriginal: old?.tomOriginal ?? null,
      tomEnsaio: old?.tomEnsaio ?? item.tone ?? null,
      tomAprovado: item.status === "APROVADO" ? item.tone ?? null : old?.tomAprovado ?? null,
      status: item.status,
    };
  });
}

/** Local (instant) versions for a matched repertoire song: learned + history. */
function localVersions(song?: Song) {
  if (!song) return { versions: [] as SongVersion[], selected: null as string | null };
  const versions = mergeVersions({
    learned: song.defaultChoice?.version ?? null,
    history: song.versionHistory ?? null,
  });
  const learned = versions.find((v) => v.source === "learned");
  return { versions, selected: learned?.id ?? null };
}

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
  /** Remote sync: program confirmed locally but not yet published to Supabase. */
  unpublished: boolean;
  /** True while a publish is in flight (remote snapshots are ignored meanwhile). */
  publishing: boolean;

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
  /** Merge API versions (Spotify/catalog) with learned/history, capped at 3. */
  setVersions: (position: number, apiVersions: SongVersion[], forName: string) => void;
  /** Minister picks the official version for this program item. */
  chooseVersion: (position: number, versionId: string | null) => void;
  confirmParsedProgram: () => void;
  /** Publish current program to Supabase (no-op without env). */
  publishCurrent: () => Promise<boolean>;
  /** Replace local program/songs/live/notices with the remote snapshot. */
  applyRemote: (snap: RemoteSnapshot) => void;
  applyRemoteLive: (live: LiveSession, programId: string | null) => void;
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
      unpublished: false,
      publishing: false,

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

      callNow: (itemId) => {
        const live = { isLive: true, currentItemId: itemId, startedAt: new Date().toISOString() };
        set({ live });
        // Every phone (Culto ao Vivo) follows the minister's CHAMAR AGORA.
        void pushLive(get().program.id, live);
      },

      endLive: () => {
        const live = { isLive: false, currentItemId: null, startedAt: null };
        set({ live });
        void pushLive(get().program.id, live);
      },

      approveTone: (rehearsalId, tone) => {
        const reh = get().rehearsals.find((r) => r.id === rehearsalId);
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
        }));
        if (reh) {
          for (const item of get().program.items) {
            if (item.songId === reh.songId) void pushItemTone(item.id, tone || null, "APROVADO");
          }
        }
      },

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

      setPendingParsed: (items) => {
        if (!items) return set({ pendingParsed: null });
        const songs = get().songs;
        const resolved = resolveAll(items, songs, get().learnedMatches).map((r) => {
          const local = localVersions(songs.find((s) => s.id === r.matchedSongId));
          return { ...r, versions: local.versions, selectedVersionId: local.selected, versionsFor: null };
        });
        set({ pendingParsed: resolved });
      },

      setVersions: (position, apiVersions, forName) =>
        set((state) => ({
          pendingParsed:
            state.pendingParsed?.map((p) => {
              if (p.position !== position || p.name !== forName) return p;
              const song = state.songs.find((s) => s.id === p.matchedSongId);
              const versions = mergeVersions({
                learned: song?.defaultChoice?.version ?? null,
                history: song?.versionHistory ?? null,
                api: apiVersions,
              });
              const stillValid = versions.some((v) => v.id === p.selectedVersionId);
              return {
                ...p,
                versions,
                versionsFor: forName,
                selectedVersionId: stillValid ? p.selectedVersionId ?? null : null,
              };
            }) ?? null,
        })),

      chooseVersion: (position, versionId) =>
        set((state) => ({
          pendingParsed:
            state.pendingParsed?.map((p) =>
              p.position === position ? { ...p, selectedVersionId: versionId } : p
            ) ?? null,
        })),

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
                    versions: localVersions(song).versions,
                    selectedVersionId: localVersions(song).selected,
                    versionsFor: null,
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
          const chosen = p.selectedVersionId
            ? p.versions?.find((v) => v.id === p.selectedVersionId) ?? null
            : null;
          // Store the lock without the transient "learned/history" label.
          const locked: SongVersion | null = chosen
            ? { ...chosen, source: chosen.spotifyTrackId ? "spotify" : "catalog" }
            : null;
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
              defaultChoice: locked ? { version: locked } : null,
              versionHistory: locked ? [locked] : null,
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
              defaultChoice: {
                ...(s0.defaultChoice ?? {}),
                ...(p.selectedCandidateId && p.matchStatus === "ambiguous"
                  ? { externalKey: normalizeSongName(p.rawName) }
                  : {}),
                // Learn the minister's pick: offered (and preselected) next time.
                ...(locked ? { version: locked } : {}),
              },
              versionHistory: locked ? addToHistory(s0.versionHistory, locked) : s0.versionHistory ?? null,
            };
          }

          const song = songs[songIdx];
          return {
            id: uuid(),
            songId: song.id,
            position: p.position || idx + 1,
            solo: p.solo,
            tone: null,
            status: "PENDENTE",
            notes: null,
            cifraStatus: song.cifraStatus,
            // Official version for THIS program: everyone opens the same recording.
            chosenVersion: locked,
          };
        });

        const rehearsals: RehearsalItem[] = rehearsalsFor(items);

        set({
          songs,
          unpublished: true,
          program: {
            ...get().program,
            id: uuid(),
            title: "Nova Programação",
            items,
          },
          rehearsals,
          pendingParsed: null,
          live: { isLive: false, currentItemId: null, startedAt: null },
        });
        void get().publishCurrent();
      },

      publishCurrent: async () => {
        const { program, songs } = get();
        set({ publishing: true });
        try {
          const ok = await publishProgram(program, songs);
          // Only clear the flag if the program wasn't replaced meanwhile.
          if (ok && get().program.id === program.id) set({ unpublished: false });
          return ok;
        } catch {
          return false;
        } finally {
          set({ publishing: false });
        }
      },

      applyRemote: (snap) => {
        const st = get();
        if (st.publishing || st.unpublished) return; // local unpublished work wins
        const sameProgram = st.program.id === snap.program.id;
        set({
          songs: snap.songs,
          program: snap.program,
          rehearsals: rehearsalsFor(snap.program.items, sameProgram ? st.rehearsals : []),
          live: snap.live ?? (sameProgram ? st.live : { isLive: false, currentItemId: null, startedAt: null }),
          ...(snap.notices ? { notices: snap.notices } : {}),
        });
      },

      applyRemoteLive: (live, programId) => {
        if (programId && programId !== get().program.id) return;
        const cur = get().live;
        if (cur.isLive === live.isLive && cur.currentItemId === live.currentItemId) return;
        set({ live });
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
        unpublished: state.unpublished,
      }),
    }
  )
);
