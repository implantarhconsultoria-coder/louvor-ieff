import type { InstrumentRole, Song, YoutubeRole } from "./types";
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
export function getSongLinks(song: Song): SongLinks {
  const generatedYt = buildYoutubeLinks(song.name, song.artist);
  const youtube = { ...generatedYt, ...(song.youtube ?? {}) };
  const spotifyUrl =
    song.spotify?.url || song.listenUrl || buildSpotifyInfo(song.name, song.artist).url;
  const cifraClubUrl = song.cifraClub || cifraClubSearchUrl(song.name, song.artist);

  const preferredRole = song.defaultChoice?.youtubeRole;
  const mainReference =
    song.reference ||
    (preferredRole && youtube[preferredRole]) ||
    youtube.oficial ||
    youtube.ao_vivo!;

  const instruments = {} as Record<InstrumentRole, string>;
  for (const role of INSTRUMENT_ROLES) {
    instruments[role] = song.instruments?.[role] || youtube[role]!;
  }

  return {
    spotifyUrl,
    spotifyIsDirect: Boolean(song.spotify?.trackId),
    youtube,
    cifraClubUrl,
    mainReference,
    instruments,
  };
}

export { INSTRUMENT_ROLES };
