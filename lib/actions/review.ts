"use server";

import { cardById } from "@/content";
import { db } from "@/lib/db/client";
import { GRADES, schedule, type CardSchedule, type Grade } from "@/lib/srs";
import { failure, type ActionResult } from "./types";

/**
 * Record one review in two round trips: read the card's state and today's date,
 * then write the new state and the log entry in a single atomic statement.
 *
 * Deliberately does not refresh the route: the session owns its queue on the
 * client, and a refresh mid-session would reshuffle it.
 */
export async function gradeCard(cardId: string, grade: Grade): Promise<ActionResult<{ dueOn: string }>> {
  if (!cardById.has(cardId) || !GRADES.includes(grade)) return { ok: false, error: "Unknown card or grade." };

  try {
    const sql = db();
    const rows = await sql<
      {
        today: string;
        due_on: string | null;
        interval_days: number | null;
        ease: number | null;
        reps: number | null;
        lapses: number | null;
      }[]
    >`
      select (now() at time zone s.time_zone)::date::text as today,
             c.due_on::text as due_on, c.interval_days, c.ease, c.reps, c.lapses
      from app_settings s
      left join card_state c on c.card_id = ${cardId}`;
    const row = rows[0];
    if (!row) return { ok: false, error: "Settings are missing. Re-run the database migration." };

    const prev: CardSchedule | null =
      row.due_on === null
        ? null
        : {
            dueOn: row.due_on,
            intervalDays: row.interval_days ?? 0,
            ease: row.ease ?? 2.5,
            reps: row.reps ?? 0,
            lapses: row.lapses ?? 0,
          };
    const next = schedule(prev, grade, row.today);

    await sql`
      with saved as (
        insert into card_state (card_id, due_on, interval_days, ease, reps, lapses, introduced_on, last_reviewed_at)
        values (${cardId}, ${next.dueOn}::date, ${next.intervalDays}, ${next.ease}, ${next.reps},
                ${next.lapses}, ${row.today}::date, now())
        on conflict (card_id) do update set
          due_on = excluded.due_on,
          interval_days = excluded.interval_days,
          ease = excluded.ease,
          reps = excluded.reps,
          lapses = excluded.lapses,
          last_reviewed_at = now(),
          updated_at = now()
        returning card_id
      )
      insert into review_log (card_id, reviewed_on, grade, was_new, interval_before, interval_after, ease_before, ease_after)
      select card_id, ${row.today}::date, ${grade}, ${prev === null}, ${prev?.intervalDays ?? 0},
             ${next.intervalDays}, ${prev?.ease ?? next.ease}, ${next.ease}
      from saved`;

    return { ok: true, data: { dueOn: next.dueOn } };
  } catch (error) {
    return failure(error);
  }
}
