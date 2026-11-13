"use server";

import { refresh } from "next/cache";
import { itemById, phaseById } from "@/content";
import { db } from "@/lib/db/client";
import { diffDays, isValidDate } from "@/lib/dates";
import { getToday } from "@/lib/db/settings";
import { NOTE_MAX, failure, type ActionResult } from "./types";

export interface TimeLogInput {
  loggedOn: string;
  minutes: number;
  /** Either a phase ID or an item ID must be given; the item wins. */
  phaseId: string | null;
  itemId: string | null;
  note: string;
}

export async function logTime(input: TimeLogInput): Promise<ActionResult> {
  const minutes = Math.round(Number(input.minutes));
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
    return { ok: false, error: "Enter between 1 minute and 24 hours." };
  }
  if (!isValidDate(input.loggedOn)) return { ok: false, error: "Pick a valid date." };

  const itemEntry = input.itemId ? itemById.get(input.itemId) : undefined;
  if (input.itemId && !itemEntry) return { ok: false, error: "Unknown item." };
  const phaseId = itemEntry?.phase.id ?? input.phaseId;
  if (!phaseId || !phaseById.has(phaseId)) return { ok: false, error: "Pick what you worked on." };

  const note = input.note.trim();
  if (note.length > NOTE_MAX) return { ok: false, error: `Keep the note under ${NOTE_MAX} characters.` };

  try {
    const today = await getToday();
    if (diffDays(today, input.loggedOn) > 1) return { ok: false, error: "That date is in the future." };
    await db()`
      insert into time_log (logged_on, minutes, phase_id, item_id, note)
      values (${input.loggedOn}::date, ${minutes}, ${phaseId}, ${itemEntry?.item.id ?? null}, ${note || null})`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteTimeLog(id: string): Promise<ActionResult> {
  if (!/^\d{1,18}$/.test(id)) return { ok: false, error: "Unknown entry." };
  try {
    await db()`delete from time_log where id = ${id}::bigint`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}
