import type { InstrumentRole, Song, SongVersion, YoutubeRole } from "./types";
import { baseTitle } from "./versions";
import {
  buildSpotifyInfo,
  buildYoutubeLinks,
  cifraClubSearchUrl,
} from "./external-links";

export interface SongLinks {
  spotifyUrl: string;
  spotifyIsDirect: boolean;
  youtube: Partial<Record<YoutubeRole, string>>;
  cifraClubUrl: string;
  mainReference: string;
  instruments: Record<InstrumentRole, string>;
  /** Version these links point to (program lock or learned default), if any. */
  version: SongVersion | null;
}

function isSearch(url?: string | null): boolean {
  return !url || /\/search|results\?search_query|[?&]q=/.test(url);
}

const INSTRUMENT_ROLES: InstrumentRole[] = [
  "bateria",
  "baixo",
  "guitarra",
  "violao",
  "teclado",
  "vocal",
  "backing",
];

/**
 * All external links for ONE song identity. Stored values win; anything
 * missing falls back to generated search URLs (works without API keys).
 */
export function getSongLinks(song: Song, programVersion?: SongVersion | null): SongLinks {
  // Program lock wins (everyone hears the same), then the learned default.
  const version = programVersion ?? song.defaultChoice?.version ?? null;
  const artist = version?.artist ?? song.artist ?? null;
  const title = version ? baseTitle(version.title) || song.name : song.name;

  const generatedYt = buildYoutubeLinks(title, artist);
  // Stored direct links (watch?v=) only apply to the generic song, not to a specific version.
  const storedYt = version
    ? {}
    : Object.fromEntries(Object.entries(song.youtube ?? {}).filter(([, u]) => !isSearch(u)));
  const youtube: Partial<Record<YoutubeRole, string>> = {
    ...generatedYt,
    ...(version ? {} : song.youtube ?? {}),
    ...storedYt,
    ...(version?.youtubeUrl ? { oficial: version.youtubeUrl } : {}),
  };

  const spotifyUrl =
    version?.spotifyUrl ||
    song.spotify?.url ||
    song.listenUrl ||
    buildSpotifyInfo(song.name, song.artist).url;
  const spotifyIsDirect = version ? Boolean(version.spotifyTrackId) : Boolean(song.spotify?.trackId);

  const cifraClubUrl =
    (song.cifraClub && !isSearch(song.cifraClub) ? song.cifraClub : null) ||
    version?.cifraClubUrl ||
    song.cifraClub ||
    cifraClubSearchUrl(song.name, song.artist);

  const preferredRole = song.defaultChoice?.youtubeRole;
  const mainReference =
    version?.youtubeUrl ||
    song.reference ||
    (preferredRole && youtube[preferredRole]) ||
    youtube.oficial ||
    youtube.ao_vivo!;

  const instruments = {} as Record<InstrumentRole, string>;
  for (const role of INSTRUMENT_ROLES) {
    instruments[role] = song.instruments?.[role] || youtube[role]!;
  }

  return { spotifyUrl, spotifyIsDirect, youtube, cifraClubUrl, mainReference, instruments, version };
}

export { INSTRUMENT_ROLES };
