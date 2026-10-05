import { getSupabase } from "./supabase";
import {
  buildFromRemote,
  isUuid,
  itemToRow,
  programToRow,
  rowToNotice,
  songToRow,
  type LiveRow,
  type NoticeRow,
  type ProgramItemRow,
  type ProgramRow,
  type SongRow,
} from "./sync-mapping";
import type { LiveSession, Notice, Program, Song } from "./types";

/**
 * Remote data layer (Supabase). Every function is a no-op returning null/false
 * when Supabase env is missing, so the app falls back to localStorage only.
 */

export async function publishProgram(program: Program, songs: Song[]): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !isUuid(program.id)) return false;

  const used = new Set(program.items.map((i) => i.songId));
  const songRows = songs.filter((s) => used.has(s.id)).map(songToRow);
  const { data: upserted, error: e1 } = await sb
    .from("louvor_songs")
    .upsert(songRows, { onConflict: "client_key" })
    .select("id, client_key");
  if (e1 || !upserted) return false;
  const uuidByKey = new Map(upserted.map((r: { id: string; client_key: string }) => [r.client_key, r.id]));

  const { error: e2 } = await sb.from("louvor_programs").upsert(programToRow(program), { onConflict: "id" });
  if (e2) return false;

  const itemRows = program.items
    .filter((i) => isUuid(i.id) && uuidByKey.has(i.songId))
    .map((i) => itemToRow(i, program.id, uuidByKey.get(i.songId)!));
  const { error: e3 } = await sb.from("louvor_program_items").upsert(itemRows, { onConflict: "id" });
  if (e3) return false;

  // New program resets the live session for every phone.
  await sb
    .from("louvor_live_session")
    .update({ program_id: program.id, current_item_id: null, is_live: false, started_at: null })
    .eq("singleton", true);
  return true;
}

export async function pushLive(programId: string, live: LiveSession): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !isUuid(programId)) return false;
  const { error } = await sb
    .from("louvor_live_session")
    .update({
      program_id: programId,
      current_item_id: live.isLive && isUuid(live.currentItemId) ? live.currentItemId : null,
      is_live: live.isLive,
      started_at: live.isLive ? live.startedAt ?? new Date().toISOString() : null,
    })
    .eq("singleton", true);
  return !error;
}

export async function pushItemTone(itemId: string, tone: string | null, status: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !isUuid(itemId)) return false;
  const { error } = await sb.from("louvor_program_items").update({ tone, status }).eq("id", itemId);
  return !error;
}

export interface RemoteSnapshot {
  program: Program;
  songs: Song[];
  live: LiveSession | null;
  notices: Notice[] | null;
}

/** Latest published program + its items/songs + live session + notices. */
export async function fetchRemote(localSongs: Song[]): Promise<RemoteSnapshot | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: programs, error } = await sb
    .from("louvor_programs")
    .select("id, title, service_date, weekday, date_label, status, created_at")
    .eq("status", "PUBLICADA")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !programs?.length) return null;
  const program = programs[0] as ProgramRow;

  const [{ data: items }, { data: liveRows }, { data: noticeRows }] = await Promise.all([
    sb.from("louvor_program_items").select("*").eq("program_id", program.id),
    sb.from("louvor_live_session").select("program_id, current_item_id, is_live, started_at").limit(1),
    sb.from("louvor_notices").select("id, title, body, date, responsible").order("date", { ascending: false }),
  ]);
  const itemRows = (items ?? []) as ProgramItemRow[];
  const songIds = Array.from(new Set(itemRows.map((i) => i.song_id)));
  const { data: songRows } = songIds.length
    ? await sb.from("louvor_songs").select("*").in("id", songIds)
    : { data: [] };

  const built = buildFromRemote(program, itemRows, (songRows ?? []) as (SongRow & { id: string })[], localSongs);
  const lr = (liveRows?.[0] ?? null) as LiveRow | null;
  const live: LiveSession | null =
    lr && lr.program_id === program.id
      ? { isLive: lr.is_live, currentItemId: lr.current_item_id, startedAt: lr.started_at }
      : lr
        ? { isLive: false, currentItemId: null, startedAt: null }
        : null;
  const notices = noticeRows && noticeRows.length ? (noticeRows as NoticeRow[]).map(rowToNotice) : null;
  return { ...built, live, notices };
}

export async function fetchLive(): Promise<(LiveSession & { programId: string | null }) | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("louvor_live_session").select("program_id, current_item_id, is_live, started_at").limit(1);
  const lr = (data?.[0] ?? null) as LiveRow | null;
  if (!lr) return null;
  return { programId: lr.program_id, isLive: lr.is_live, currentItemId: lr.current_item_id, startedAt: lr.started_at };
}

/** Realtime: calls back on any program/item/live change. Returns unsubscribe. */
export function subscribeRemote(onChange: (table: string) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel("louvor-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "louvor_live_session" }, () => onChange("live"))
    .on("postgres_changes", { event: "*", schema: "public", table: "louvor_programs" }, () => onChange("programs"))
    .on("postgres_changes", { event: "*", schema: "public", table: "louvor_program_items" }, () => onChange("items"))
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}
