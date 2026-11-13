import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import { db } from "./client";
import { getSnapshot } from "./snapshot";

export interface TimeLogEntry {
  id: string;
  loggedOn: string;
  minutes: number;
  phaseId: string;
  itemId: string | null;
  note: string | null;
}

/** day -> minutes logged, for roughly the last ten weeks. */
export async function getMinutesByDay(): Promise<Readonly<Record<string, number | undefined>>> {
  return (await getSnapshot()).minutesByDay;
}

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
