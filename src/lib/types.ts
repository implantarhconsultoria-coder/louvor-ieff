export type ToneStatus = "PENDENTE" | "TESTANDO" | "APROVADO";
export type CifraStatus = "PENDENTE" | "DISPONIVEL";
export type SongFilter = "TODAS" | "RECENTES" | "MAIS_TOCADAS" | "NOVAS" | "PENDENTES";
export type RehearsalStatus = "PENDENTE" | "TESTANDO" | "APROVADO";

export interface User {
  id: string;
  name: string;
  role: "integrante" | "ministro" | "lider";
  avatarInitials: string;
  /** Instrument the member plays — when set, its material is shown first. */
  instrument?: InstrumentRole | null;
}

export interface Song {
  id: string;
  name: string;
  artist?: string | null;
  reference?: string | null;
  tone?: string | null;
  cifraStatus: CifraStatus;
  cifraContent?: string | null;
  lyrics?: string | null;
  listenUrl?: string | null;
  timesPlayed: number;
  lastPlayed?: string | null;
  lastSolo?: string | null;
  isNew?: boolean;
  /** Single song identity: all external refs live on this record. */
  spotify?: SpotifyInfo | null;
  youtube?: Partial<Record<YoutubeRole, string>> | null;
  cifraClub?: string | null;
  /** Per-instrument materials (url), fed from YouTube refs / user links. */
  instruments?: Partial<Record<InstrumentRole, string>> | null;
  /** Learned default choice (preferred youtube role / match key / official version). */
  defaultChoice?: {
    youtubeRole?: YoutubeRole;
    externalKey?: string;
    /** Last version the minister chose — offered first next time. */
    version?: SongVersion | null;
  } | null;
  /** Versions used in past programs (most recent first, max 5). */
  versionHistory?: SongVersion[] | null;
}

export type VersionSource = "learned" | "history" | "spotify" | "catalog";

/** One concrete recording of a song (artist/album) the whole team listens to. */
export interface SongVersion {
  /** "spotify:<trackId>" | "itunes:<trackId>" */
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  /** Spotify popularity 0–100 when from the API. */
  popularity?: number | null;
  /** How many recordings of this title the artist has in the catalog (usage proxy). */
  usageCount?: number | null;
  /** Primary listen link. Direct track when spotifyTrackId is set, else exact search. */
  spotifyUrl: string;
  spotifyTrackId?: string | null;
  youtubeUrl?: string | null;
  cifraClubUrl?: string | null;
  appleMusicUrl?: string | null;
  artwork?: string | null;
  durationMs?: number | null;
  source: VersionSource;
}

export type YoutubeRole =
  | "oficial"
  | "ao_vivo"
  | "lyric"
  | "bateria"
  | "baixo"
  | "guitarra"
  | "violao"
  | "teclado"
  | "vocal"
  | "backing";

export type InstrumentRole =
  | "bateria"
  | "baixo"
  | "guitarra"
  | "violao"
  | "teclado"
  | "vocal"
  | "backing";

export interface SpotifyInfo {
  trackId: string | null;
  url: string;
  artist: string | null;
  album: string | null;
  coverUrl: string | null;
  durationMs: number | null;
}

export interface ProgramItem {
  id: string;
  songId: string;
  position: number;
  solo: string;
  tone?: string | null;
  status: ToneStatus;
  notes?: string | null;
  cifraStatus: CifraStatus;
  /** Official version locked by the minister for THIS program — everyone uses it. */
  chosenVersion?: SongVersion | null;
}

export interface Program {
  id: string;
  title: string;
  dateLabel: string;
  weekday: string;
  dateISO: string;
  items: ProgramItem[];
}

export interface RehearsalItem {
  id: string;
  songId: string;
  solo: string;
  tomOriginal?: string | null;
  tomEnsaio?: string | null;
  tomAprovado?: string | null;
  status: RehearsalStatus;
}

export interface Notice {
  id: string;
  title: string;
  date: string;
  message: string;
  responsible: string;
}

export interface LiveSession {
  isLive: boolean;
  currentItemId: string | null;
  startedAt?: string | null;
}

export interface ParsedProgramItem {
  position: number;
  name: string;
  solo: string;
}

export type MatchStatus = "found" | "nova" | "nova_with_refs" | "ambiguous";

export interface SongCandidate {
  id: string;
  name: string;
  score: number;
  reason: "exact" | "fuzzy" | "learned";
}

export interface ExternalRefs {
  spotify: string;
  youtube: Partial<Record<YoutubeRole, string>>;
  cifraClub: string;
}

export interface ResolvedProgramItem extends ParsedProgramItem {
  /** Name exactly as parsed from the message (used to learn choices). */
  rawName: string;
  matchStatus: MatchStatus;
  matchedSongId: string | null;
  /** When ambiguous: possible repertoire matches (user picks). */
  candidates?: SongCandidate[];
  /** User pick for ambiguous (song id) or null to create as nova. */
  selectedCandidateId: string | null;
  externalRefs: ExternalRefs;
  /** Enriched from API when keys exist (Spotify metadata). */
  spotifyInfo?: SpotifyInfo | null;
  /** Up to 3 most used versions to pick the official one from. */
  versions?: SongVersion[];
  /** Name the versions were fetched for (refetch when it changes). */
  versionsFor?: string | null;
  selectedVersionId?: string | null;
}
