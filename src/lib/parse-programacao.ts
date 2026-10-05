import type { ParsedProgramItem } from "./types";

/**
 * Parses WhatsApp-style program messages into structured items.
 * Supports lines like:
 * 1. Plano Melhor — Solo: Juliana
 * 1 - Plano Melhor - Juliana
 * 1) Me Atraiu Solo Gabi
 */
export function parseProgramacaoMessage(raw: string): ParsedProgramItem[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedProgramItem[] = [];

  for (const line of lines) {
    // Skip headers / noise
    if (/^(programação|programacao|culto|sábado|sabado|louvores?|repertório|repertorio)/i.test(line)) {
      continue;
    }

    const numbered = line.match(
      /^(\d+)\s*[.)\-–—:]\s*(.+)$/
    );
    if (!numbered) continue;

    const position = parseInt(numbered[1], 10);
    const rest = numbered[2].trim();

    let solo = "PENDENTE";
    let name = rest;

    // Patterns: "Name — Solo: X" | "Name - Solo X" | "Name Solo: X" | "Name / Solo X"
    const soloMatch = rest.match(
      /^(.*?)\s*[—–\-|/]\s*(?:solo\s*:?\s*)(.+)$/i
    ) || rest.match(
      /^(.*?)\s+solo\s*:?\s*(.+)$/i
    );

    if (soloMatch) {
      name = soloMatch[1].trim();
      solo = soloMatch[2].trim();
    }

    // Clean leftover labels
    name = name.replace(/^(música|musica|louvor)\s*:?\s*/i, "").trim();
    solo = solo.replace(/^(solo|voz)\s*:?\s*/i, "").trim();

    if (!name) continue;

    items.push({ position, name, solo: solo || "PENDENTE" });
  }

  return items.sort((a, b) => a.position - b.position);
}
