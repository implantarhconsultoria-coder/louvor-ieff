import type { ParsedProgramItem } from "./types";

/** Lines that are greetings, headers, or noise — never songs. */
const NOISE_LINE =
  /^(boa\s+(tarde|noite|dia)|bom\s+dia|ol[áa]|oi\b|eae|e\s*a[ií]|pessoal|galera|equipe|time|seguem?\b|segue\b|aqui\s+(est[aã]o|vai|vão)|manda[mr]?\b|confiram?\b|programação|programacao|culto|s[áa]bado|domingo|louvores?|repert[oó]rio|lista\b|m[uú]sicas?\b|ordem\b|aten[cç][aã]o|obs\.?|obs:|ps:|obs\b)/i;

// Built via RegExp constructor so the "u" flag compiles with the ES5 TS target.
const HAS_LETTER = new RegExp("\\p{L}", "u");
const EMOJI = new RegExp("[\\p{Extended_Pictographic}\\u{FE0F}\\u{1F3FB}-\\u{1F3FF}\\u200D]", "gu");

const LEADING_MARKER =
  /^(?:(\d+)\s*[.)\-–—:]|[•●▪◦\*]+|[-–—])\s*/;

const SIGNOFF =
  /^(obrigad[oa]s?|valeu|abra[cç]os?|bjs|beijos|deus\s+aben[cç]oe|fiquem\s+com\s+deus|at[eé]\s+(s[áa]bado|domingo|l[áa]|mais)|tom\s*:|ensaio\b|hor[áa]rio\b|chegar\b)/i;

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.length < 2) return true;
  // Must contain at least one letter (skip emoji-only / punctuation-only lines)
  if (!HAS_LETTER.test(t)) return true;
  if (SIGNOFF.test(t)) return true;
  // Header-style lines ending with ":" (e.g. "Louvores do culto:")
  if (/:\s*$/.test(t) && !/\bsolo\s*:\s*$/i.test(t)) return true;
  // Pure greeting / sentence ending with comma or ellipsis and no song shape
  if (NOISE_LINE.test(t)) return true;
  // "seguem os louvores para o culto de sábado:" style
  if (/louvores?.{0,40}(culto|s[áa]bado|domingo)/i.test(t) && !hasSongShape(t)) {
    return true;
  }
  return false;
}

function hasSongShape(line: string): boolean {
  const stripped = line.replace(LEADING_MARKER, "").trim();
  if (/\([^)]+\)\s*$/.test(stripped)) return true;
  if (/\bsolo\s*:/i.test(stripped)) return true;
  if (/^\d+\s*[.)\-–—:]/.test(line.trim())) return true;
  return false;
}

/**
 * Split solo string on / or - into multiple names, then join with " / ".
 * Keeps compound first names like "Ana Clara" intact (spaces stay).
 */
export function splitSolos(raw: string): string {
  const cleaned = raw
    .replace(/^(solo|voz)\s*:?\s*/i, "")
    .trim();
  if (!cleaned) return "PENDENTE";

  // Prefer explicit separators / or - (not spaces)
  const parts = cleaned
    .split(/\s*[\/|]\s*|\s*[-–—]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) return cleaned;
  return parts.join(" / ");
}

/**
 * Extract song name + solo(s) from a single content line (marker already stripped).
 */
export function extractNameAndSolo(rest: string): { name: string; solo: string } | null {
  let text = rest
    // strip emoji / pictographs and trailing punctuation noise
    .replace(EMOJI, "")
    .replace(/[\s.,;!]+$/, "")
    .trim();
  if (!text) return null;

  text = text.replace(/^(m[uú]sica|musica|louvor)\s*:?\s*/i, "").trim();
  if (!text) return null;

  let name = text;
  let solo = "PENDENTE";

  // 1) Trailing parentheses: "Plano Melhor (Juliana)" or "Vento do espírito(Gabi)"
  //    Also: "Escolhido (Henrique-Quezia)"
  const paren = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren && paren[1].trim()) {
    name = paren[1].trim();
    solo = splitSolos(paren[2]);
    name = name.replace(/^(m[uú]sica|musica|louvor)\s*:?\s*/i, "").trim();
    if (name) return { name, solo };
  }

  // 2) Explicit Solo: patterns
  //    "Name — Solo: X" | "Name - Solo X" | "Name Solo: X" | "Name / Solo: X"
  const soloLabeled =
    text.match(/^(.*?)\s*[—–\-|/]\s*solo\s*:?\s*(.+)$/i) ||
    text.match(/^(.*?)\s+solo\s*:?\s*(.+)$/i);
  if (soloLabeled && soloLabeled[1].trim()) {
    name = soloLabeled[1].trim();
    solo = splitSolos(soloLabeled[2]);
    return { name, solo: solo || "PENDENTE" };
  }

  // 3) Trailing " - Name" / " — Name" / " / Name" when right side looks like person name(s)
  const dashSolo = text.match(/^(.*?)\s+[-–—\/]\s+(.+)$/);
  if (dashSolo && dashSolo[1].trim() && looksLikePersonName(dashSolo[2])) {
    name = dashSolo[1].trim();
    solo = splitSolos(dashSolo[2]);
    return { name, solo: solo || "PENDENTE" };
  }

  // 4) Plain song title only
  name = text.replace(/\s+/g, " ").trim();
  if (!name || isNoiseLine(name)) return null;
  return { name, solo: "PENDENTE" };
}

function looksLikePersonName(s: string): boolean {
  const t = s.trim();
  if (!t || t.length > 60) return false;
  // Reject if it looks like a long song title (many words without separators)
  const words = t.split(/\s+/);
  if (words.length > 4 && !/[\/\-–—|]/.test(t)) return false;
  // Reject common song-ish words as sole content that aren't names
  if (/^(tom|cifra|letra|versão|versao|oficial|ao\s+vivo)$/i.test(t)) return false;
  return true;
}

/**
 * Parses WhatsApp-style program messages into structured items.
 * Accepts numbered, bulleted, hyphen, plain lines, parentheses solos,
 * greetings mixed in, and multi-solo via / or -.
 */
export function parseProgramacaoMessage(raw: string): ParsedProgramItem[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());

  const items: ParsedProgramItem[] = [];
  let autoPos = 0;

  for (const line of lines) {
    if (!line) continue;
    if (isNoiseLine(line) && !hasSongShape(line)) continue;

    let content = line;
    let explicitPos: number | null = null;

    const marker = content.match(LEADING_MARKER);
    if (marker) {
      if (marker[1]) explicitPos = parseInt(marker[1], 10);
      content = content.slice(marker[0].length).trim();
    }

    if (!content) continue;
    // After stripping marker, re-check noise (e.g. "1. Boa tarde")
    if (isNoiseLine(content) && !hasSongShape(content)) continue;

    const extracted = extractNameAndSolo(content);
    if (!extracted) continue;

    autoPos += 1;
    items.push({
      position: explicitPos && !Number.isNaN(explicitPos) ? explicitPos : autoPos,
      name: extracted.name.replace(/\s+/g, " ").trim(),
      solo: extracted.solo || "PENDENTE",
    });
  }

  // Re-number sequentially if positions collide or are sparse after filtering
  const used = new Set<number>();
  let next = 1;
  for (const item of items) {
    if (used.has(item.position)) {
      while (used.has(next)) next += 1;
      item.position = next;
    }
    used.add(item.position);
    next = Math.max(next, item.position + 1);
  }

  return items.sort((a, b) => a.position - b.position);
}
