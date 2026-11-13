"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db/client";
import { isValidDate, isValidTimeZone, localDate } from "@/lib/dates";
import { failure, type ActionResult } from "./types";

export interface SettingsInput {
  startDate: string;
  weeklyTargetHours: number;
  timeZone: string;
  newCardsPerDay: number;
}

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  const startDate = input.startDate.trim();
  if (startDate && !isValidDate(startDate)) return { ok: false, error: "Pick a valid start date." };

  const hours = Number(input.weeklyTargetHours);
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 100) {
    return { ok: false, error: "Weekly target must be between 0.5 and 100 hours." };
  }
  if (!isValidTimeZone(input.timeZone)) return { ok: false, error: "Unknown time zone." };

  const newCards = Math.round(Number(input.newCardsPerDay));
  if (!Number.isFinite(newCards) || newCards < 0 || newCards > 100) {
    return { ok: false, error: "New cards per day must be between 0 and 100." };
  }

  try {
    await db()`
      update app_settings set
        start_date = ${startDate || null}::date,
        weekly_target_minutes = ${Math.round(hours * 60)},
        time_zone = ${input.timeZone},
        new_cards_per_day = ${newCards},
        updated_at = now()`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}

/** One-click start: the plan begins today in the browser's time zone. */
export async function startPlan(timeZone: string): Promise<ActionResult> {
  if (!isValidTimeZone(timeZone)) return { ok: false, error: "Unknown time zone." };
  try {
    const today = localDate(new Date(), timeZone);
    await db()`
      update app_settings set start_date = ${today}::date, time_zone = ${timeZone}, updated_at = now()`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}
