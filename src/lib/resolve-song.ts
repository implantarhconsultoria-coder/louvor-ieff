import type {
  MatchStatus,
  ResolvedProgramItem,
  ParsedProgramItem,
  Song,
  SongCandidate,
} from "./types";
import { normalizeSongName, similarity } from "./normalize";
import {
  buildSpotifyInfo,
  buildYoutubeLinks,
  cifraClubSearchUrl,
} from "./external-links";
import { getSongLinks } from "./song-links";

const EXACT_THRESHOLD = 1;
const FUZZY_STRONG = 0.88;
const FUZZY_WEAK = 0.72;
const AMBIGUOUS_GAP = 0.06;

export function findSongCandidates(
  query: string,
  songs: Song[],
  learnedMatches: Record<string, string>
): SongCandidate[] {
  const nq = normalizeSongName(query);
  if (!nq) return [];

  // Learned default: treat as exact preferred match
  const learnedId = learnedMatches[nq];
  if (learnedId) {
    const song = songs.find((s) => s.id === learnedId);
    if (song) {
      return [{ id: song.id, name: song.name, score: 1, reason: "learned" }];
    }
  }

  const scored: SongCandidate[] = songs.map((s) => {
    const ns = normalizeSongName(s.name);
    let score = similarity(query, s.name);
    // Partial title (word-boundary containment) → only a *possible* match,
    // and only when the lengths are comparable ("Digno" ≠ "Digno de Glória").
    const shorter = ns.length <= nq.length ? ns : nq;
    const longer = ns.length <= nq.length ? nq : ns;
    const wordContained = ` ${longer} `.includes(` ${shorter} `);
    if (wordContained && shorter.length / longer.length >= 0.5) {
      score = Math.max(score, 0.8);
    }
    // Exact normalized
    if (ns === nq) score = 1;
    return { id: s.id, name: s.name, score, reason: score === 1 ? "exact" : "fuzzy" };
  });

  return scored
    .filter((c) => c.score >= FUZZY_WEAK)
    .sort((a, b) => b.score - a.score);
}

function attachExternalRefs(name: string, artist?: string | null) {
  return {
    spotify: buildSpotifyInfo(name, artist).url,
    youtube: buildYoutubeLinks(name, artist),
    cifraClub: cifraClubSearchUrl(name, artist),
  };
}

/**
 * Resolve a parsed item against repertoire.
 * Never blocks — unknown songs become "nova" with PENDENTE-ready refs.
 * Ambiguous matches are NOT auto-bound.
 */
export function resolveParsedItem(
  item: ParsedProgramItem,
  songs: Song[],
  learnedMatches: Record<string, string>
): ResolvedProgramItem {
  const candidates = findSongCandidates(item.name, songs, learnedMatches);
  const top = candidates[0];
  const second = candidates[1];

  let matchStatus: MatchStatus = "nova";
  let matchedSongId: string | null = null;
  let showCandidates: SongCandidate[] | undefined;

  if (top && top.score >= EXACT_THRESHOLD) {
    matchStatus = "found";
    matchedSongId = top.id;
  } else if (
    top &&
    top.score >= FUZZY_STRONG &&
    (!second || top.score - second.score >= AMBIGUOUS_GAP)
  ) {
    matchStatus = "found";
    matchedSongId = top.id;
  } else if (top && top.score >= FUZZY_WEAK && second && second.score >= FUZZY_WEAK) {
    // Ambiguous — do not auto-bind
    matchStatus = "ambiguous";
    showCandidates = candidates.slice(0, 5);
  } else if (top && top.score >= FUZZY_WEAK) {
    // Single but uncertain match — let the user confirm (never auto-bind).
    matchStatus = "ambiguous";
    showCandidates = candidates.slice(0, 5);
  } else {
    matchStatus = "nova";
  }

  const matched = matchedSongId
    ? songs.find((s) => s.id === matchedSongId)
    : undefined;

  const displayName = matched?.name ?? item.name;
  // Matched song: reuse the refs already stored on that single song identity.
  const externalRefs = matched
    ? (() => {
        const l = getSongLinks(matched);
        return { spotify: l.spotifyUrl, youtube: l.youtube, cifraClub: l.cifraClubUrl };
      })()
    : attachExternalRefs(displayName, null);

  // Nova with generated search refs
  if (matchStatus === "nova") {
    matchStatus = "nova_with_refs";
  }

  return {
    ...item,
    rawName: item.name,
    name: displayName,
    matchStatus,
    matchedSongId,
    candidates: showCandidates,
    externalRefs,
    selectedCandidateId: matchedSongId,
    spotifyInfo: matched?.spotify?.trackId ? matched.spotify : null,
  };
}

export function resolveAll(
  items: ParsedProgramItem[],
  songs: Song[],
  learnedMatches: Record<string, string>
): ResolvedProgramItem[] {
  return items.map((i) => resolveParsedItem(i, songs, learnedMatches));
}
