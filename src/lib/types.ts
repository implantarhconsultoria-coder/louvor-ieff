export type ToneStatus = "PENDENTE" | "TESTANDO" | "APROVADO";
export type CifraStatus = "PENDENTE" | "DISPONIVEL";
export type SongFilter = "TODAS" | "RECENTES" | "MAIS_TOCADAS" | "NOVAS" | "PENDENTES";
export type RehearsalStatus = "PENDENTE" | "TESTANDO" | "APROVADO";

export interface User {
  id: string;
  name: string;
  role: "integrante" | "ministro" | "lider";
  avatarInitials: string;
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
