/**
 * Mobile-only transformations; originals are never changed.
 * Fail on unexpected upstream signatures to prevent incomplete releases.
 */
export function convertDetailPage(source, kind) {
  const name = kind === "cifra" ? "CifraPage" : "MusicaPage";
  const signature = new RegExp(
    "export default function " + name +
    "\\(\\{ params \\}: \\{ params: \\{ id: string \\} \\}\\) \\{\\s*const id = params\\.id;"
  );
  if (!signature.test(source)) throw new Error("Unexpected " + name + " signature");
  let result = source.replace(
    signature,
    "export default function " + name + "() {\n" +
    "  const [id, setId] = useState(\"\");\n" +
    "  useEffect(() => {\n" +
    "    setId(new URLSearchParams(window.location.search).get(\"id\") ?? \"\");\n" +
    "  }, []);"
  );
  if (kind === "cifra") {
    if (!result.includes('import { useState } from "react";')) throw new Error("React import changed");
    result = result.replace('import { useState } from "react";', 'import { useEffect, useState } from "react";');
  } else {
    result = result.replace('"use client";', '"use client";\nimport { useEffect, useState } from "react";');
  }
  return result;
}

export function convertLinks(source) {
  return source
    .replace(/\/musica\/\$\{([^}]+)\}\/cifra/g, "/musica/cifra/?id=" + "$" + "{$1}")
    .replace(/\/musica\/\$\{([^}]+)\}/g, "/musica/?id=" + "$" + "{$1}");
}

export function convertServerRequests(source) {
  const tick = String.fromCharCode(96);
  const oldRef = tick + "/api/song-refs?" + "$" + "{qs.toString()}" + tick;
  if (!source.includes(oldRef)) throw new Error("Song-refs API call changed upstream");
  const newRef = tick +
    "$" + '{process.env.NEXT_PUBLIC_LOUVOR_API_BASE_URL ?? "https://louvor-ieff.vercel.app"}' +
    "/api/song-refs?" + "$" + "{qs.toString()}" + tick;
  return source.replaceAll(oldRef, newRef);
}
