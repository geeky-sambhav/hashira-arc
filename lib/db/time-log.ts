import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import { db } from "./client";

export interface TimeLogEntry {
  id: string;
  loggedOn: string;
  minutes: number;
  phaseId: string;
  itemId: string | null;
  note: string | null;
}

/** day -> minutes logged, for every day on or after `since`. */
export const getMinutesByDay = cache(
  async (since: string): Promise<Readonly<Record<string, number | undefined>>> => {
    await io();
    const rows = await db()<{ day: string; minutes: number }[]>`
      select logged_on::text as day, sum(minutes)::int as minutes
      from time_log
      where logged_on >= ${since}::date
      group by logged_on`;
    return Object.fromEntries(rows.map((r) => [r.day, r.minutes]));
  },
);

export const getRecentTimeLogs = cache(async (limit: number): Promise<TimeLogEntry[]> => {
  await io();
  const rows = await db()<
    { id: string; logged_on: string; minutes: number; phase_id: string; item_id: string | null; note: string | null }[]
  >`
    select id::text as id, logged_on::text as logged_on, minutes, phase_id, item_id, note
    from time_log
    order by logged_on desc, id desc
    limit ${limit}`;
  return rows.map((r) => ({
    id: r.id,
    loggedOn: r.logged_on,
    minutes: r.minutes,
    phaseId: r.phase_id,
    itemId: r.item_id,
    note: r.note,
  }));
});

/** phase ID -> total minutes logged. */
export const getMinutesByPhase = cache(async (): Promise<Readonly<Record<string, number | undefined>>> => {
  await io();
  const rows = await db()<{ phase_id: string; minutes: number }[]>`
    select phase_id, sum(minutes)::int as minutes from time_log group by phase_id`;
  return Object.fromEntries(rows.map((r) => [r.phase_id, r.minutes]));
});

export const getMinutesForItem = cache(async (itemId: string): Promise<number> => {
  await io();
  const rows = await db()<{ minutes: number | null }[]>`
    select sum(minutes)::int as minutes from time_log where item_id = ${itemId}`;
  return rows[0]?.minutes ?? 0;
});
