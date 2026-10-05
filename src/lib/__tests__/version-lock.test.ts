import { test } from "node:test";
import assert from "node:assert/strict";
import { useAppStore } from "../store";
import { getSongLinks } from "../song-links";
import type { SongVersion } from "../types";

const v = (id: string, artist: string): SongVersion => ({
  id, title: "Vento do Espírito", artist, album: "Album",
  spotifyUrl: `https://open.spotify.com/search/Vento%20do%20Esp%C3%ADrito%20${encodeURIComponent(artist)}`,
  youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(artist)}`,
  cifraClubUrl: "https://www.cifraclub.com.br/?q=x", source: "catalog",
});

test("minister's chosen version is locked on the program item and learned", () => {
  const s = useAppStore.getState();
  s.setPendingParsed([{ position: 1, name: "Vento do Espírito", solo: "Gabi" }]);
  let p = useAppStore.getState().pendingParsed![0];
  assert.equal(p.matchedSongId, "s2");
  assert.equal(p.selectedVersionId, null); // nothing preselected without a learned choice

  s.setVersions(1, [v("itunes:1", "Aline Barros"), v("itunes:2", "Bruna Karla"), v("itunes:3", "Leonor"), v("itunes:4", "Extra")], "Vento do Espírito");
  p = useAppStore.getState().pendingParsed![0];
  assert.equal(p.versions!.length, 3); // capped
  s.chooseVersion(1, "itunes:2");
  s.confirmParsedProgram();

  const st = useAppStore.getState();
  const item = st.program.items[0];
  assert.equal(item.chosenVersion?.id, "itunes:2");
  assert.equal(item.chosenVersion?.artist, "Bruna Karla");

  // Every screen resolves links through the program lock → same recording for all.
  const song = st.getSong("s2")!;
  const links = getSongLinks(song, item.chosenVersion);
  assert.equal(links.spotifyUrl, item.chosenVersion!.spotifyUrl);
  assert.equal(links.mainReference, item.chosenVersion!.youtubeUrl);
  assert.equal(song.defaultChoice?.version?.id, "itunes:2");
  assert.equal(song.versionHistory?.[0].id, "itunes:2");
});

test("next program offers the learned version first and preselects it", () => {
  const s = useAppStore.getState();
  s.setPendingParsed([{ position: 1, name: "vento do espirito", solo: "Juliana" }]);
  let p = useAppStore.getState().pendingParsed![0];
  assert.equal(p.versions![0].source, "learned");
  assert.equal(p.selectedVersionId, "itunes:2");

  // API returns the same artist again + others: no duplicate, learned stays first.
  s.setVersions(1, [v("itunes:9", "Bruna Karla"), v("itunes:1", "Aline Barros")], "Vento do Espírito");
  p = useAppStore.getState().pendingParsed![0];
  assert.deepEqual(p.versions!.map((x) => x.artist), ["Bruna Karla", "Aline Barros"]);
  assert.equal(p.selectedVersionId, "itunes:2");
});

test("confirm without a pick still works (never blocks) and falls back to links", () => {
  const s = useAppStore.getState();
  s.setPendingParsed([{ position: 1, name: "Canção Nova Sem Versão", solo: "Gabi" }]);
  s.setVersions(1, [], "Canção Nova Sem Versão");
  s.confirmParsedProgram();
  const st = useAppStore.getState();
  const item = st.program.items[0];
  assert.equal(item.chosenVersion, null);
  const links = getSongLinks(st.getSong(item.songId)!, item.chosenVersion);
  assert.match(links.spotifyUrl, /open\.spotify\.com\/search/);
});

test("stale API results for a different name are ignored", () => {
  const s = useAppStore.getState();
  s.setPendingParsed([{ position: 1, name: "Plano Melhor", solo: "Juliana" }]);
  s.setVersions(1, [v("itunes:7", "Paloma Possi")], "Outra Música");
  assert.equal(useAppStore.getState().pendingParsed![0].versions!.length, 0);
});
