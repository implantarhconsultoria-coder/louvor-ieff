import type { YoutubeRole, SpotifyInfo } from "./types";

const YT_ROLES: { role: YoutubeRole; querySuffix: string }[] = [
  { role: "oficial", querySuffix: "oficial" },
  { role: "ao_vivo", querySuffix: "ao vivo" },
  { role: "lyric", querySuffix: "lyric video" },
  { role: "bateria", querySuffix: "bateria" },
  { role: "baixo", querySuffix: "baixo" },
  { role: "guitarra", querySuffix: "guitarra" },
  { role: "violao", querySuffix: "violão" },
  { role: "teclado", querySuffix: "teclado" },
  { role: "vocal", querySuffix: "vocal" },
  { role: "backing", querySuffix: "backing vocal" },
];

export function youtubeSearchUrl(song: string, suffix: string, artist?: string | null): string {
  const parts = [song, artist, suffix].filter(Boolean).join(" ");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(parts)}`;
}

export function buildYoutubeLinks(
  songName: string,
  artist?: string | null
): Partial<Record<YoutubeRole, string>> {
  const out: Partial<Record<YoutubeRole, string>> = {};
  for (const { role, querySuffix } of YT_ROLES) {
    out[role] = youtubeSearchUrl(songName, querySuffix, artist);
  }
  return out;
}

/** Cifra Club search / deep link — never scrapes chord content. */
export function cifraClubSearchUrl(songName: string, artist?: string | null): string {
  const q = [songName, artist].filter(Boolean).join(" ");
  return `https://www.cifraclub.com.br/?q=${encodeURIComponent(q)}`;
}

export function spotifySearchUrl(songName: string, artist?: string | null): string {
  const q = [songName, artist].filter(Boolean).join(" ");
  return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
}

export function buildSpotifyInfo(
  songName: string,
  artist?: string | null
): SpotifyInfo {
  return {
    trackId: null,
    url: spotifySearchUrl(songName, artist),
    artist: artist ?? null,
    album: null,
    coverUrl: null,
    durationMs: null,
  };
}

export const YOUTUBE_SECTION_LABELS: { role: YoutubeRole | "referencia" | "cifra"; label: string }[] = [
  { role: "referencia", label: "REFERÊNCIA PRINCIPAL" },
  { role: "cifra", label: "CIFRA" },
  { role: "bateria", label: "BATERIA" },
  { role: "baixo", label: "BAIXO" },
  { role: "guitarra", label: "GUITARRA" },
  { role: "violao", label: "VIOLÃO" },
  { role: "teclado", label: "TECLADO" },
  { role: "vocal", label: "VOCAL" },
  { role: "backing", label: "BACKING" },
];
