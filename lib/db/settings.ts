import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import { localDate } from "@/lib/dates";
import { db } from "./client";

export interface Settings {
  startDate: string | null;
  weeklyTargetMinutes: number;
  timeZone: string;
  newCardsPerDay: number;
}

export const getSettings = cache(async (): Promise<Settings> => {
  await io(); // keep the query out of every prerender
  const rows = await db()<
    { start_date: string | null; weekly_target_minutes: number; time_zone: string; new_cards_per_day: number }[]
  >`
    select start_date::text as start_date, weekly_target_minutes, time_zone, new_cards_per_day
    from app_settings`;
  const row = rows[0];
  return {
    startDate: row?.start_date ?? null,
    weeklyTargetMinutes: row?.weekly_target_minutes ?? 1500,
    timeZone: row?.time_zone ?? "UTC",
    newCardsPerDay: row?.new_cards_per_day ?? 10,
  };
});

/** Today's calendar day in the user's time zone. */
export const getToday = cache(async (): Promise<string> => {
  const { timeZone } = await getSettings();
  return localDate(new Date(), timeZone);
});
