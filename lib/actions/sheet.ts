"use server";

import { refresh } from "next/cache";
import { leafIds, nodeById } from "@/content";
import { db } from "@/lib/db/client";
import { failure, NOTE_MAX, type ActionResult } from "./types";

/** More than the largest section, so "tick everything under this topic" always fits. */
const MAX_BATCH = 2000;

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= MAX_BATCH && value.every((v) => typeof v === "string");

/** Tick and untick rows in one statement. Only leaf rows can be ticked. */
export async function saveChecks(on: string[], off: string[]): Promise<ActionResult> {
  if (!isIdList(on) || !isIdList(off)) return { ok: false, error: "That change was not understood." };
  const changes = new Map<string, boolean>();
  for (const id of on) changes.set(id, true);
  for (const id of off) {
    if (changes.has(id)) return { ok: false, error: "A row cannot be ticked and unticked at once." };
    changes.set(id, false);
  }
  for (const id of changes.keys()) {
    if (!leafIds.has(id)) return { ok: false, error: "Unknown row." };
  }
  if (changes.size === 0) return { ok: true };

  const ids = [...changes.keys()];
  const flags = [...changes.values()];
  try {
    await db()`
      insert into sheet_state (node_id, done, done_at)
      select id, d, case when d then now() end
        from unnest(${ids}::text[], ${flags}::boolean[]) as t(id, d)
      on conflict (node_id) do update set
        done = excluded.done,
        done_at = case when excluded.done then coalesce(sheet_state.done_at, excluded.done_at) end,
        updated_at = now()`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}

/** Mark a row to come back to. */
export async function setStarred(nodeId: string, starred: boolean): Promise<ActionResult> {
  if (typeof nodeId !== "string" || typeof starred !== "boolean" || !leafIds.has(nodeId)) {
    return { ok: false, error: "Unknown row." };
  }
  try {
    await db()`
      insert into sheet_state (node_id, starred) values (${nodeId}, ${starred})
      on conflict (node_id) do update set starred = excluded.starred, updated_at = now()`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}

/** Save a personal note on a row or group. An empty note removes it. */
export async function saveNote(nodeId: string, text: string): Promise<ActionResult> {
  if (typeof nodeId !== "string" || typeof text !== "string" || !nodeById.has(nodeId)) {
    return { ok: false, error: "Unknown row." };
  }
  const note = text.trim();
  if (note.length > NOTE_MAX) return { ok: false, error: `Notes can be up to ${NOTE_MAX} characters.` };
  try {
    await db()`
      insert into sheet_state (node_id, note) values (${nodeId}, ${note || null})
      on conflict (node_id) do update set note = excluded.note, updated_at = now()`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}
