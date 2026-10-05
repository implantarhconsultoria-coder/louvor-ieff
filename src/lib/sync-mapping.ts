import type { Notice, Program, ProgramItem, Song, SongVersion } from "./types";

/** Row shapes of the louvor_* tables (Supabase project Igreja Filhos da Fé). */
export interface SongRow {
  id?: string;
  client_key: string;
  title: string;
  artist: string | null;
  tone: string | null;
  status: string;
  is_new: boolean;
  last_solo: string | null;
  spotify: Song["spotify"] | null;
  youtube: Song["youtube"] | null;
  cifra_club: { url: string } | null;
  instruments: Song["instruments"] | null;
  default_choice: Song["defaultChoice"] | null;
  version_history: SongVersion[] | null;
}

export interface ProgramRow {
  id: string;
  title: string;
  service_date: string | null;
  weekday: string | null;
  date_label: string | null;
  status: string;
  created_at?: string;
}

export interface ProgramItemRow {
  id: string;
  program_id: string;
  song_id: string;
  position: number;
  solo: string;
  tone: string | null;
  status: string;
  notes: string | null;
  chosen_version: SongVersion | null;
}

export interface LiveRow {
  program_id: string | null;
  current_item_id: string | null;
  is_live: boolean;
  started_at: string | null;
}

export interface NoticeRow {
  id: string;
  title: string;
  body: string;
  date: string;
  responsible: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s?: string | null): s is string => Boolean(s && UUID_RE.test(s));

export function songToRow(s: Song): SongRow {
  return {
    client_key: s.id,
    title: s.name,
    artist: s.artist ?? null,
    tone: s.tone ?? null,
    status: s.cifraStatus,
    is_new: Boolean(s.isNew),
    last_solo: s.lastSolo ?? null,
    spotify: s.spotify ?? null,
    youtube: s.youtube ?? null,
    cifra_club: s.cifraClub ? { url: s.cifraClub } : null,
    instruments: s.instruments ?? null,
    default_choice: s.defaultChoice ?? null,
    version_history: s.versionHistory ?? null,
  };
}

/** Remote song → app song. Keeps local-only stats (timesPlayed etc.) when present. */
export function rowToSong(r: SongRow, local?: Song): Song {
  return {
    id: r.client_key,
    name: r.title,
    artist: r.artist,
    reference: local?.reference ?? null,
    tone: r.tone,
    cifraStatus: r.status === "DISPONIVEL" ? "DISPONIVEL" : "PENDENTE",
    cifraContent: local?.cifraContent ?? null,
    lyrics: local?.lyrics ?? null,
    listenUrl: local?.listenUrl ?? null,
    timesPlayed: local?.timesPlayed ?? 0,
    lastPlayed: local?.lastPlayed ?? null,
    lastSolo: r.last_solo,
    isNew: r.is_new,
    spotify: r.spotify,
    youtube: r.youtube,
    cifraClub: r.cifra_club?.url ?? null,
    instruments: r.instruments,
    defaultChoice: r.default_choice,
    versionHistory: r.version_history,
  };
}

export function programToRow(p: Program): ProgramRow {
  return {
    id: p.id,
    title: p.title,
    service_date: /^\d{4}-\d{2}-\d{2}$/.test(p.dateISO) ? p.dateISO : null,
    weekday: p.weekday ?? null,
    date_label: p.dateLabel ?? null,
    status: "PUBLICADA",
  };
}

export function itemToRow(i: ProgramItem, programId: string, songUuid: string): ProgramItemRow {
  return {
    id: i.id,
    program_id: programId,
    song_id: songUuid,
    position: i.position,
    solo: i.solo,
    tone: i.tone ?? null,
    status: i.status,
    notes: i.notes ?? null,
    chosen_version: i.chosenVersion ?? null,
  };
}

/** Build the app Program + songs from remote rows (remote is the source of truth). */
export function buildFromRemote(
  program: ProgramRow,
  items: ProgramItemRow[],
  songRows: (SongRow & { id: string })[],
  localSongs: Song[]
): { program: Program; songs: Song[] } {
  const byUuid = new Map(songRows.map((r) => [r.id, r]));
  const localByKey = new Map(localSongs.map((s) => [s.id, s]));
  const merged = new Map(localSongs.map((s) => [s.id, s]));
  for (const r of songRows) merged.set(r.client_key, rowToSong(r, localByKey.get(r.client_key)));

  const programItems: ProgramItem[] = items
    .filter((i) => byUuid.has(i.song_id))
    .sort((a, b) => a.position - b.position)
    .map((i) => {
      const song = merged.get(byUuid.get(i.song_id)!.client_key)!;
      return {
        id: i.id,
        songId: song.id,
        position: i.position,
        solo: i.solo,
        tone: i.tone,
        status: (["PENDENTE", "TESTANDO", "APROVADO"].includes(i.status) ? i.status : "PENDENTE") as ProgramItem["status"],
        notes: i.notes,
        cifraStatus: song.cifraStatus,
        chosenVersion: i.chosen_version,
      };
    });

  return {
    program: {
      id: program.id,
      title: program.title,
      dateLabel: program.date_label ?? "",
      weekday: program.weekday ?? "",
      dateISO: program.service_date ?? "",
      items: programItems,
    },
    songs: Array.from(merged.values()),
  };
}

export function rowToNotice(r: NoticeRow): Notice {
  return { id: r.id, title: r.title, date: r.date, message: r.body, responsible: r.responsible ?? "" };
}
