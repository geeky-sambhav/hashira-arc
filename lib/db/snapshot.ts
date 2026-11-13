import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import type { ItemStatus } from "@/content/types";
import { db } from "./client";

export interface Settings {
  startDate: string | null;
  weeklyTargetMinutes: number;
  timeZone: string;
  newCardsPerDay: number;
}

export interface CardStateRow {
  cardId: string;
  dueOn: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  introducedOn: string;
}

export interface Snapshot {
  /** Today's calendar day in the user's time zone. */
  today: string;
  settings: Settings;
  progress: Record<string, ItemStatus | undefined>;
  evidenceCounts: Record<string, number | undefined>;
  cards: CardStateRow[];
  /** Minutes per day for the last MINUTES_WINDOW_DAYS days. */
  minutesByDay: Record<string, number | undefined>;
  /** Days with logged time or a review in the last ACTIVE_WINDOW_DAYS days. */
  activeDays: string[];
}

export const MINUTES_WINDOW_DAYS = 70;
export const ACTIVE_WINDOW_DAYS = 400;

/**
 * The user's whole state in one query.
 *
 * This is a single-user app with a few hundred small rows, and the database can
 * be hundreds of milliseconds away. Fetching everything in one round trip keeps
 * every page to a single network wait instead of a chain of them.
 */
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  await io(); // keep the query, and the connection, out of every prerender
  const rows = await db()<{ snapshot: Snapshot }[]>`
    with s as (
      select *, (now() at time zone time_zone)::date as today from app_settings
    )
    select json_build_object(
      'today', s.today::text,
      'settings', json_build_object(
        'startDate', s.start_date::text,
        'weeklyTargetMinutes', s.weekly_target_minutes,
        'timeZone', s.time_zone,
        'newCardsPerDay', s.new_cards_per_day
      ),
      'progress', coalesce(
        (select json_object_agg(item_id, status) from item_progress where status <> 'todo'), '{}'::json),
      'evidenceCounts', coalesce(
        (select json_object_agg(item_id, n)
           from (select item_id, count(*)::int as n from lab_evidence group by item_id) e), '{}'::json),
      'cards', coalesce(
        (select json_agg(json_build_object(
            'cardId', card_id, 'dueOn', due_on::text, 'intervalDays', interval_days,
            'ease', ease, 'reps', reps, 'lapses', lapses, 'introducedOn', introduced_on::text))
           from card_state), '[]'::json),
      'minutesByDay', coalesce(
        (select json_object_agg(day, minutes)
           from (select logged_on::text as day, sum(minutes)::int as minutes
                   from time_log where logged_on >= s.today - ${MINUTES_WINDOW_DAYS}::int
                  group by logged_on) t), '{}'::json),
      'activeDays', coalesce(
        (select json_agg(day)
           from (select logged_on::text as day from time_log where logged_on >= s.today - ${ACTIVE_WINDOW_DAYS}::int
                 union
                 select reviewed_on::text from review_log where reviewed_on >= s.today - ${ACTIVE_WINDOW_DAYS}::int) d),
        '[]'::json)
    ) as snapshot
    from s`;

  const snapshot = rows[0]?.snapshot;
  if (!snapshot) throw new Error("app_settings has no row. Re-run the migration in supabase/migrations.");
  return snapshot;
});
