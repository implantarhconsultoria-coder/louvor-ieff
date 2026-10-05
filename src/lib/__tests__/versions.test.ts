import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addToHistory,
  baseTitle,
  mergeVersions,
  rankCatalogVersions,
  type CatalogTrack,
} from "../versions";
import type { SongVersion } from "../types";

let n = 0;
const t = (trackName: string, artistName: string, primaryGenreName = "Música religiosa", collectionName = "Album"): CatalogTrack => ({
  trackId: ++n,
  trackName,
  artistName,
  collectionName,
  primaryGenreName,
  trackViewUrl: `https://music.apple.com/br/album/x?i=${n}`,
  artworkUrl100: `https://img/${n}.jpg`,
});

// Shapes taken from the real iTunes catalog response for "Vento do Espírito".
const VENTO: CatalogTrack[] = [
  t("Vento do Espírito", "Lela Costa", "Reggae"),
  t("Vento do Espírito", "Bruna Karla", "Brasileira"),
  t("Vento do Espírito", "Comunidade de Nilópolis"),
  t("Vento do Espírito (Ao Vivo)", "Aline Barros"),
  t("Vento do Espírito", "Aline Barros"),
  t("Vento do Espírito", "Leonor", "Gospel"),
  t("Vento do Espírito (Ao Vivo)", "Aline Barros"),
  t("Vento do Espírito (Gravado na Deezer, São Paulo)", "Aline Barros"),
  t("Vento do Espírito", "Bruna Karla"),
  t("Vento do Espírito (Ao Vivo)", "Bruna Karla"),
  t("Vento do Espírito (Playback)", "Aline Barros"),
];

test("baseTitle strips (Ao Vivo) / (feat.) / - Single", () => {
  assert.equal(baseTitle("Plano Melhor (Ao Vivo)"), "Plano Melhor");
  assert.equal(baseTitle("Plano Melhor (feat. X & Y)"), "Plano Melhor");
  assert.equal(baseTitle("Me Atraiu - Single"), "Me Atraiu");
});

test("ranks top 3 most used gospel versions, distinct artists", () => {
  const v = rankCatalogVersions("Vento do Espírito", VENTO);
  assert.equal(v.length, 3);
  assert.deepEqual(v.map((x) => x.artist), ["Aline Barros", "Bruna Karla", "Comunidade de Nilópolis"]);
  assert.equal(v[0].usageCount, 4); // playback excluded
  assert.equal(v[0].source, "catalog");
  assert.match(v[0].spotifyUrl, /open\.spotify\.com\/search\/.*Aline%20Barros/);
  assert.match(v[0].youtubeUrl!, /Aline%20Barros/);
  assert.match(v[0].cifraClubUrl!, /cifraclub\.com\.br/);
  assert.ok(v[0].appleMusicUrl);
});

test("excludes medleys, playback, covers, remixes and other titles", () => {
  const v = rankCatalogVersions("Plano Melhor", [
    t("Promessa/Plano Melhor", "Gabriela Rocha", "Gospel"),
    t("Plano Melhor (Playback)", "Paloma Possi"),
    t("Plano Melhor (Cover)", "Groove"),
    t("Plano Melhor / Edifica / Bom Estarmos Aqui", "MORADA"),
    t("Plano Perfeito", "Outro"),
    t("Plano Melhor", "Paloma Possi"),
  ]);
  assert.deepEqual(v.map((x) => x.artist), ["Paloma Possi"]);
});

test("only 1 found → 1 version; 0 found → empty (never invents)", () => {
  assert.equal(rankCatalogVersions("Plano Melhor", [t("Plano Melhor", "Paloma Possi")]).length, 1);
  assert.deepEqual(rankCatalogVersions("Canção Inédita da Igreja", VENTO), []);
  assert.deepEqual(rankCatalogVersions("x", []), []);
});

test("featured/duo artists group under the main artist", () => {
  const v = rankCatalogVersions("Me Atraiu", [
    t("Me Atraiu (Ao Vivo)", "Abdiel Arsenio & BRASAS"),
    t("Me Atraiu", "Abdiel Arsenio"),
    t("Me Atraiu", "Eli Soares", "Gospel"),
  ]);
  assert.equal(v.length, 2);
  assert.equal(v[0].usageCount, 2);
});

const mk = (id: string, artist: string, source: SongVersion["source"] = "catalog", spotifyTrackId: string | null = null): SongVersion => ({
  id, title: "Song", artist, spotifyUrl: `https://s/${id}`, spotifyTrackId, source,
});

test("merge priority: learned > history > API, deduped, capped at 3", () => {
  const merged = mergeVersions({
    learned: mk("itunes:1", "Bruna Karla"),
    history: [mk("itunes:9", "Bruna Karla"), mk("itunes:2", "Leonor")],
    api: [mk("itunes:3", "Aline Barros"), mk("itunes:4", "Comunidade"), mk("itunes:5", "Outro")],
  });
  assert.deepEqual(merged.map((m) => m.artist), ["Bruna Karla", "Leonor", "Aline Barros"]);
  assert.deepEqual(merged.map((m) => m.source), ["learned", "history", "catalog"]);
});

test("spotify track id dedupes across sources", () => {
  const merged = mergeVersions({
    learned: mk("spotify:abc", "A", "spotify", "abc"),
    api: [mk("spotify:abc", "A", "spotify", "abc"), mk("spotify:def", "B", "spotify", "def")],
  });
  assert.equal(merged.length, 2);
});

test("history keeps most recent first, max 5, no dupes", () => {
  let h: SongVersion[] = [];
  for (const a of ["A", "B", "C", "D", "E", "F"]) h = addToHistory(h, mk(`i:${a}`, a));
  h = addToHistory(h, mk("i:C2", "C"));
  assert.equal(h.length, 5);
  assert.equal(h[0].artist, "C");
  assert.equal(h.filter((x) => x.artist === "C").length, 1);
});
