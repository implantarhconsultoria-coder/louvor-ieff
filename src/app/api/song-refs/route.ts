import { NextResponse } from "next/server";
import { similarity, normalizeSongName } from "@/lib/normalize";
import type { SpotifyInfo, YoutubeRole } from "@/lib/types";

/**
 * Enriches a song with official Spotify / YouTube data when API keys exist.
 *
 * TODO (API keys — set in Vercel → Project → Settings → Environment Variables):
 *   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET  → Spotify Web API (client credentials)
 *   YOUTUBE_API_KEY                           → YouTube Data API v3
 * Without keys this returns { configured: false } and the app keeps using
 * generated search URLs (fully functional, just not deep-linked).
 *
 * Cifra Club has no public/official API: we only ever produce a search link,
 * never fetch or copy chord content.
 */

export const dynamic = "force-dynamic";

let spotifyToken: { value: string; exp: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (spotifyToken && spotifyToken.exp > Date.now() + 30_000) return spotifyToken.value;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };
  spotifyToken = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  external_urls: { spotify: string };
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  popularity: number;
}

async function searchSpotify(name: string, artist?: string | null): Promise<SpotifyInfo | null> {
  const token = await getSpotifyToken();
  if (!token) return null;
  const q = artist ? `track:${name} artist:${artist}` : `track:${name}`;
  const url = `https://api.spotify.com/v1/search?type=track&market=BR&limit=10&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { tracks?: { items: SpotifyTrack[] } };
  const tracks = json.tracks?.items ?? [];

  // Disambiguate: title similarity + artist match; then popularity.
  const scored = tracks
    .map((t) => {
      let score = similarity(name, t.name.replace(/\s*[-(].*$/, ""));
      if (artist) {
        const artistHit = t.artists.some(
          (a) => normalizeSongName(a.name) === normalizeSongName(artist)
        );
        score += artistHit ? 0.3 : -0.3;
      }
      return { t, score: score + t.popularity / 1000 };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  // Only bind when confident — otherwise caller keeps the search link.
  if (!best || best.score < 0.9) return null;
  if (!artist) {
    // No artist known: ambiguous if exact-title hits come from different artists.
    const exactArtists = new Set(
      tracks
        .filter((t) => similarity(name, t.name.replace(/\s*[-(].*$/, "")) >= 0.95)
        .map((t) => normalizeSongName(t.artists[0]?.name ?? ""))
    );
    if (exactArtists.size > 1) return null;
  }
  const t = best.t;
  return {
    trackId: t.id,
    url: t.external_urls.spotify,
    artist: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    coverUrl: t.album.images[0]?.url ?? null,
    durationMs: t.duration_ms,
  };
}

const YT_QUERIES: { role: YoutubeRole; suffix: string }[] = [
  { role: "oficial", suffix: "clipe oficial" },
  { role: "ao_vivo", suffix: "ao vivo" },
  { role: "lyric", suffix: "lyric video" },
];

interface YtItem {
  id: { videoId?: string };
  snippet: { title: string; channelTitle: string };
}

function channelScore(channel: string, title: string, artist?: string | null): number {
  const c = normalizeSongName(channel);
  let s = 0;
  if (artist && c.includes(normalizeSongName(artist))) s += 3;
  if (/\b(oficial|official|vevo|music|musica|records|gospel)\b/.test(c)) s += 2;
  if (/\b(oficial|official)\b/i.test(title)) s += 1;
  if (/\b(cover|karaoke|playback|tutorial|aula)\b/i.test(title)) s -= 2;
  return s;
}

async function searchYoutube(
  name: string,
  artist?: string | null
): Promise<Partial<Record<YoutubeRole, string>> | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const out: Partial<Record<YoutubeRole, string>> = {};
  // Only the 3 reference categories use the API (quota: 100 units/search).
  // Instrument categories stay as smart search URLs.
  await Promise.all(
    YT_QUERIES.map(async ({ role, suffix }) => {
      const q = [name, artist, suffix].filter(Boolean).join(" ");
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&regionCode=BR&q=${encodeURIComponent(q)}&key=${key}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { items?: YtItem[] };
      const items = (json.items ?? []).filter((i) => i.id.videoId);
      const ranked = items
        .map((i) => ({
          i,
          score:
            channelScore(i.snippet.channelTitle, i.snippet.title, artist) +
            similarity(name, i.snippet.title.split(/[-|(]/)[0]) * 2,
        }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      if (best && best.score >= 2) {
        out[role] = `https://www.youtube.com/watch?v=${best.i.id.videoId}`;
      }
    })
  );
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  const artist = searchParams.get("artist")?.trim() || null;
  const configured = {
    spotify: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
  };
  if (!name) return NextResponse.json({ configured, error: "name required" }, { status: 400 });
  if (!configured.spotify && !configured.youtube) {
    return NextResponse.json({ configured, spotify: null, youtube: null });
  }
  try {
    const [spotify, youtube] = await Promise.all([
      configured.spotify ? searchSpotify(name, artist) : Promise.resolve(null),
      configured.youtube ? searchYoutube(name, artist) : Promise.resolve(null),
    ]);
    return NextResponse.json({ configured, spotify, youtube });
  } catch {
    return NextResponse.json({ configured, spotify: null, youtube: null });
  }
}
