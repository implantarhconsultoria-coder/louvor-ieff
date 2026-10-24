import test from "node:test";
import assert from "node:assert/strict";
import { convertDetailPage, convertLinks, convertServerRequests } from "../scripts/transform.mjs";

test("static detail route accepts newly created song IDs", () => {
  const source = '"use client";\nexport default function MusicaPage({ params }: { params: { id: string } }) {\n  const id = params.id;\n return null;\n}';
  const output = convertDetailPage(source, "musica");
  assert.match(output, /URLSearchParams/);
  assert.match(output, /import \{ useEffect, useState \}/);
  assert.doesNotMatch(output, /params\.id/);
});

test("cifra page keeps state hooks and receives URL ID", () => {
  const source = '"use client";\nimport { useState } from "react";\nexport default function CifraPage({ params }: { params: { id: string } }) {\n  const id = params.id;\n return null;\n}';
  const output = convertDetailPage(source, "cifra");
  assert.match(output, /import \{ useEffect, useState \} from "react"/);
  assert.match(output, /URLSearchParams/);
});

test("internal links retain source IDs after conversion", () => {
  const tick = String.fromCharCode(96);
  const input = "href={" + tick + "/musica/" + "$" + "{item.songId}" + tick + "}";
  const output = "href={" + tick + "/musica/?id=" + "$" + "{item.songId}" + tick + "}";
  assert.equal(convertLinks(input), output);
  const chordLink = "/musica/" + "$" + "{item.songId}/cifra";
  const chordOut = "/musica/cifra/?id=" + "$" + "{item.songId}";
  assert.equal(convertLinks(chordLink), chordOut);
});

test("API keys never migrate into client bundle", () => {
  const tick = String.fromCharCode(96);
  const source = "fetch(" + tick + "/api/song-refs?" + "$" + "{qs.toString()}" + tick + ")";
  const result = convertServerRequests(source);
  assert.match(result, /NEXT_PUBLIC_LOUVOR_API_BASE_URL/);
  assert.match(result, /song-refs/);
  assert.doesNotMatch(result, /SPOTIFY_CLIENT_SECRET/);
});

test("upstream signature changes block conversion instead of silently breaking app", () => {
  assert.throws(() => convertDetailPage("changed", "musica"));
  assert.throws(() => convertServerRequests("changed"));
});
