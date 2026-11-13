"use server";

import { cardById } from "@/content";
import { db } from "@/lib/db/client";
import { getToday } from "@/lib/db/settings";
import { GRADES, schedule, type CardSchedule, type Grade } from "@/lib/srs";
import { failure, type ActionResult } from "./types";

/**
 * Record one review. Deliberately does not refresh the route: the session owns
 * its queue on the client, and a refresh mid-session would reshuffle it.
 */
export async function gradeCard(cardId: string, grade: Grade): Promise<ActionResult<{ dueOn: string }>> {
  if (!cardById.has(cardId) || !GRADES.includes(grade)) return { ok: false, error: "Unknown card or grade." };

  try {
    const today = await getToday();
    const next = await db().begin(async (sql) => {
      const rows = await sql<
        { due_on: string; interval_days: number; ease: number; reps: number; lapses: number }[]
      >`
        select due_on::text as due_on, interval_days, ease, reps, lapses
        from card_state where card_id = ${cardId} for update`;
      const row = rows[0];
      const prev: CardSchedule | null = row
        ? { dueOn: row.due_on, intervalDays: row.interval_days, ease: row.ease, reps: row.reps, lapses: row.lapses }
        : null;
      const result = schedule(prev, grade, today);

      await sql`
        insert into card_state (card_id, due_on, interval_days, ease, reps, lapses, introduced_on, last_reviewed_at)
        values (${cardId}, ${result.dueOn}::date, ${result.intervalDays}, ${result.ease}, ${result.reps},
                ${result.lapses}, ${today}::date, now())
        on conflict (card_id) do update set
          due_on = excluded.due_on,
          interval_days = excluded.interval_days,
          ease = excluded.ease,
          reps = excluded.reps,
          lapses = excluded.lapses,
          last_reviewed_at = now(),
          updated_at = now()`;
      await sql`
        insert into review_log (card_id, reviewed_on, grade, was_new, interval_before, interval_after, ease_before, ease_after)
        values (${cardId}, ${today}::date, ${grade}, ${prev === null}, ${prev?.intervalDays ?? 0},
                ${result.intervalDays}, ${prev?.ease ?? result.ease}, ${result.ease})`;
      return result;
    });
    return { ok: true, data: { dueOn: next.dueOn } };
  } catch (error) {
    return failure(error);
  }
}
