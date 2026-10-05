import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDateBR(iso: string): string {
  try {
    const d = new Date(iso + (iso.includes("T") ? "" : "T12:00:00"));
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function displayTone(tone?: string | null): string {
  return tone?.trim() || "PENDENTE";
}

export function displayOrOmit(value?: string | null): string | null {
  const v = value?.trim();
  if (!v || v.toUpperCase() === "PENDENTE") return null;
  return v;
}
