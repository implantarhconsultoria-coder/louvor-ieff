import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFromRemote, isUuid, itemToRow, programToRow, rowToSong, songToRow } from "../sync-mapping";
import { useAppStore } from "../store";
import { SONGS } from "../demo-data";
import type { SongVersion } from "../types";

const version: SongVersion = {
  id: "itunes:42", title: "Me Atraiu (Ao Vivo)", artist: "Gabriela Rocha", album: "A Presença",
  spotifyUrl: "https://open.spotify.com/track/abc", spotifyTrackId: "abc", source: "spotify",
};

test("song ↔ row round trip keeps the single song identity", () => {
  const song = { ...SONGS[3], spotify: { trackId: "abc", url: "u", artist: "A", album: "B", coverUrl: null, durationMs: 1 }, cifraClub: "https://www.cifraclub.com.br/?q=x", defaultChoice: { version }, versionHistory: [version] };
  const row = songToRow(song);
  assert.equal(row.client_key, "s4");
  assert.deepEqual(row.cifra_club, { url: "https://www.cifraclub.com.br/?q=x" });
  const back = rowToSong({ ...row, id: "u-1" } as never, song);
  assert.equal(back.id, "s4");
  assert.equal(back.defaultChoice?.version?.artist, "Gabriela Rocha");
  assert.equal(back.timesPlayed, song.timesPlayed); // local stats preserved
});

test("program/item rows carry the locked chosen_version", () => {
  const pid = "11111111-1111-4111-8111-111111111111";
  const iid = "22222222-2222-4222-8222-222222222222";
  const prow = programToRow({ id: pid, title: "Nova Programação", dateLabel: "03 OUT", weekday: "Sábado", dateISO: "2026-10-03", items: [] });
  assert.equal(prow.service_date, "2026-10-03");
  const irow = itemToRow({ id: iid, songId: "s4", position: 1, solo: "Gabi", status: "PENDENTE", cifraStatus: "PENDENTE", chosenVersion: version }, pid, "song-uuid");
  assert.equal(irow.chosen_version?.id, "itunes:42");
  assert.ok(isUuid(pid) && !isUuid("pi1"));
});

test("buildFromRemote maps remote items back to app song ids, sorted", () => {
  const pid = "11111111-1111-4111-8111-111111111111";
  const built = buildFromRemote(
    { id: pid, title: "Nova", service_date: "2026-10-10", weekday: "Sábado", date_label: "10 OUT", status: "PUBLICADA" },
    [
      { id: "i2", program_id: pid, song_id: "u2", position: 2, solo: "Juliana", tone: null, status: "PENDENTE", notes: null, chosen_version: null },
      { id: "i1", program_id: pid, song_id: "u1", position: 1, solo: "Gabi", tone: "G", status: "APROVADO", notes: null, chosen_version: version },
    ],
    [
      { ...songToRow(SONGS[3]), id: "u1" },
      { ...songToRow({ ...SONGS[0], id: "s-new-remote", name: "Bondade de Deus", isNew: true }), id: "u2" },
    ],
    SONGS
  );
  assert.deepEqual(built.program.items.map((i) => i.songId), ["s4", "s-new-remote"]);
  assert.equal(built.program.items[0].chosenVersion?.artist, "Gabriela Rocha");
  assert.equal(built.program.items[0].status, "APROVADO");
  assert.ok(built.songs.find((s) => s.id === "s-new-remote")?.isNew);
  assert.equal(built.songs.length, SONGS.length + 1);
});

test("confirm creates uuid program/items; without Supabase env it stays local (unpublished)", async () => {
  const s = useAppStore.getState();
  s.setPendingParsed([{ position: 1, name: "Me Atraiu", solo: "Gabi" }]);
  s.confirmParsedProgram();
  await new Promise((r) => setTimeout(r, 10));
  const st = useAppStore.getState();
  assert.ok(isUuid(st.program.id));
  assert.ok(isUuid(st.program.items[0].id));
  assert.equal(st.unpublished, true); // no env → publish no-op, local behavior kept
});

test("remote snapshot is ignored while local work is unpublished, applied otherwise", () => {
  const remoteProgram = { id: "33333333-3333-4333-8333-333333333333", title: "Remota", dateLabel: "", weekday: "", dateISO: "", items: [{ id: "44444444-4444-4444-8444-444444444444", songId: "s1", position: 1, solo: "Juliana", status: "PENDENTE" as const, cifraStatus: "PENDENTE" as const, chosenVersion: version }] };
  const snap = { program: remoteProgram, songs: SONGS, live: { isLive: true, currentItemId: remoteProgram.items[0].id, startedAt: null }, notices: null };
  useAppStore.getState().applyRemote(snap);
  assert.notEqual(useAppStore.getState().program.id, remoteProgram.id);

  useAppStore.setState({ unpublished: false });
  useAppStore.getState().applyRemote(snap);
  const st = useAppStore.getState();
  assert.equal(st.program.id, remoteProgram.id);
  assert.equal(st.live.currentItemId, remoteProgram.items[0].id); // same AGORA on every phone
  assert.equal(st.rehearsals.length, 1);
});

test("remote live for another program is ignored", () => {
  const st = useAppStore.getState();
  st.applyRemoteLive({ isLive: false, currentItemId: null, startedAt: null }, "55555555-5555-4555-8555-555555555555");
  assert.equal(useAppStore.getState().live.isLive, true);
  st.applyRemoteLive({ isLive: false, currentItemId: null, startedAt: null }, st.program.id);
  assert.equal(useAppStore.getState().live.isLive, false);
});
