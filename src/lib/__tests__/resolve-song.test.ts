import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveParsedItem } from "../resolve-song";
import { SONGS } from "../demo-data";
import type { Song } from "../types";

const base = { position: 1, solo: "Gabi" };

test("exact normalized match (accents/case)", () => {
  const r = resolveParsedItem({ ...base, name: "vento do espirito" }, SONGS, {});
  assert.equal(r.matchStatus, "found");
  assert.equal(r.matchedSongId, "s2");
  assert.equal(r.name, "Vento do Espírito");
});

test("fuzzy match small typo", () => {
  const r = resolveParsedItem({ ...base, name: "Plano Melho" }, SONGS, {});
  assert.equal(r.matchStatus, "found");
  assert.equal(r.matchedSongId, "s1");
});

test("unknown song → nova with refs, never blocks", () => {
  const r = resolveParsedItem({ ...base, name: "Bondade de Deus" }, SONGS, {});
  assert.equal(r.matchStatus, "nova_with_refs");
  assert.equal(r.matchedSongId, null);
  assert.match(r.externalRefs.cifraClub, /cifraclub\.com\.br/);
  assert.match(r.externalRefs.spotify, /open\.spotify\.com\/search/);
  assert.match(r.externalRefs.youtube.oficial!, /youtube\.com\/results/);
  assert.ok(r.externalRefs.youtube.bateria);
});

test("ambiguous → candidates, not auto-bound", () => {
  const songs: Song[] = [
    { ...SONGS[0], id: "a1", name: "Digno de Glória" },
    { ...SONGS[0], id: "a2", name: "Digno de Honra" },
  ];
  const r = resolveParsedItem({ ...base, name: "Digno de" }, songs, {});
  assert.equal(r.matchStatus, "ambiguous");
  assert.equal(r.matchedSongId, null);
  assert.ok((r.candidates?.length ?? 0) >= 2);
});

test("learned choice resolves without asking", () => {
  const songs: Song[] = [
    { ...SONGS[0], id: "a1", name: "Digno de Glória" },
    { ...SONGS[0], id: "a2", name: "Digno de Honra" },
  ];
  const r = resolveParsedItem({ ...base, name: "Digno de" }, songs, { "digno de": "a2" });
  assert.equal(r.matchStatus, "found");
  assert.equal(r.matchedSongId, "a2");
});

test("longer distinct titles are NOT bound to a short repertoire title", () => {
  const r1 = resolveParsedItem({ ...base, name: "Digno de Glória" }, SONGS, {});
  assert.notEqual(r1.matchedSongId, "s10");
  assert.equal(r1.matchStatus, "nova_with_refs");
});

test("single uncertain match is offered, not auto-bound", () => {
  const songs: Song[] = [{ ...SONGS[0], id: "x1", name: "Lugar Seguro Ao Vivo" }];
  const r = resolveParsedItem({ ...base, name: "Lugar Seguro" }, songs, {});
  assert.equal(r.matchStatus, "ambiguous");
  assert.equal(r.matchedSongId, null);
  assert.equal(r.candidates?.[0].id, "x1");
});
