import type { SongVersion } from "./types";
import { normalizeSongName, similarity } from "./normalize";
import { youtubeSearchUrl, cifraClubSearchUrl } from "./external-links";

export const MAX_VERSIONS = 3;

/** Variants that are never an "official version" to rehearse with. */
const EXCLUDED_VARIANT =
  /\b(playback|instrumental|karaok[eê]|cover|remix|8d|slowed|sped\s*up|reverb|medley|pot-?pourri|tutorial)\b/i;

/** Strip "(Ao Vivo)", "(feat. X)", "- Single" style suffixes to compare the base title. */
export function baseTitle(title: string): string {
  return title
    .replace(/\s*[\(\[][^)\]]*[\)\]]/g, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
}

function genreScore(genre?: string | null): number {
  const g = normalizeSongName(genre ?? "");
  if (/(religiosa|gospel|christian|crista|worship|louvor)/.test(g)) return 2;
  if (/(inspira)/.test(g)) return 1;
  return 0;
}

/** Shape of an iTunes Search API song result (public Apple catalog, no key). */
export interface CatalogTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  primaryGenreName?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
}

export function spotifyExactSearchUrl(title: string, artist: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;
}

function firstArtist(name: string): string {
  return normalizeSongName(name.split(/\s*(?:,|&| e | feat\.?| part\.?| x )\s*/i)[0] ?? name);
}

/**
 * Rank catalog results into distinct-artist versions of `songName`.
 * Order: gospel genre > how many recordings that artist has of this title
 * ("mais usadas") > catalog relevance. Never invents: only real results.
 */
export function rankCatalogVersions(songName: string, tracks: CatalogTrack[]): SongVersion[] {
  type Group = { rep: CatalogTrack; firstIdx: number; count: number; genre: number };
  const groups = new Map<string, Group>();

  tracks.forEach((t, idx) => {
    if (!t?.trackName || !t?.artistName) return;
    if (EXCLUDED_VARIANT.test(t.trackName) || EXCLUDED_VARIANT.test(t.collectionName ?? "")) return;
    // Medleys like "Promessa/Plano Melhor" are not the song itself.
    if (/\//.test(baseTitle(t.trackName))) return;
    if (similarity(baseTitle(t.trackName), songName) < 0.9) return;

    const key = firstArtist(t.artistName);
    const g = groups.get(key);
    const gs = genreScore(t.primaryGenreName);
    if (!g) {
      groups.set(key, { rep: t, firstIdx: idx, count: 1, genre: gs });
    } else {
      g.count += 1;
      if (gs > g.genre) g.genre = gs;
    }
  });

  return Array.from(groups.values())
    .sort((a, b) => b.genre - a.genre || b.count - a.count || a.firstIdx - b.firstIdx)
    .slice(0, MAX_VERSIONS)
    .map(({ rep, count }) => {
      const title = baseTitle(rep.trackName) || rep.trackName;
      return {
        id: `itunes:${rep.trackId}`,
        title: rep.trackName,
        artist: rep.artistName,
        album: rep.collectionName ?? null,
        popularity: null,
        usageCount: count,
        spotifyUrl: spotifyExactSearchUrl(title, rep.artistName),
        spotifyTrackId: null,
        youtubeUrl: youtubeSearchUrl(title, "oficial", rep.artistName),
        cifraClubUrl: cifraClubSearchUrl(title, rep.artistName),
        appleMusicUrl: rep.trackViewUrl ?? null,
        artwork: rep.artworkUrl100 ?? null,
        durationMs: rep.trackTimeMillis ?? null,
        source: "catalog" as const,
      };
    });
}

/** Identity used to dedupe the same recording coming from different sources. */
export function versionKey(v: SongVersion): string {
  if (v.spotifyTrackId) return `sp:${v.spotifyTrackId}`;
  return `a:${firstArtist(v.artist)}`;
}

/**
 * Merge candidate versions with the required priority, capped at 3:
 * 1) learned default for this repertoire song, 2) past program picks,
 * 3) API versions (Spotify popularity, or catalog usage).
 */
export function mergeVersions(input: {
  learned?: SongVersion | null;
  history?: SongVersion[] | null;
  api?: SongVersion[] | null;
}): SongVersion[] {
  const out: SongVersion[] = [];
  const seen = new Set<string>();
  const push = (v: SongVersion | null | undefined, source?: SongVersion["source"]) => {
    if (!v || out.length >= MAX_VERSIONS) return;
    const k = versionKey(v);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(source ? { ...v, source } : v);
  };
  push(input.learned, "learned");
  for (const v of input.history ?? []) push(v, "history");
  for (const v of input.api ?? []) push(v);
  return out;
}

/** Prepend a chosen version to history (dedup, max 5). */
export function addToHistory(history: SongVersion[] | null | undefined, v: SongVersion): SongVersion[] {
  const k = versionKey(v);
  return [v, ...(history ?? []).filter((h) => versionKey(h) !== k)].slice(0, 5);
}
