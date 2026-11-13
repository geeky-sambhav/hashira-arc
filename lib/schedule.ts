import { addDays, diffDays, startOfWeek } from "./dates";

export type PlanPosition =
  | { state: "unset" }
  | { state: "before"; daysUntilStart: number }
  | { state: "active"; week: number; dayOfWeek: number }
  | { state: "finished" };

/** Where `today` falls in a plan of `totalWeeks` weeks starting on `startDate`. */
export function planPosition(startDate: string | null, today: string, totalWeeks: number): PlanPosition {
  if (!startDate) return { state: "unset" };
  const elapsed = diffDays(startDate, today);
  if (elapsed < 0) return { state: "before", daysUntilStart: -elapsed };
  const week = Math.floor(elapsed / 7) + 1;
  if (week > totalWeeks) return { state: "finished" };
  return { state: "active", week, dayOfWeek: (elapsed % 7) + 1 };
}

export interface PaceItem {
  id: string;
  week: number;
  estHours: number;
  optional?: boolean;
}

export interface Pace {
  /** Hours of required work in weeks that have fully passed. */
  expectedHours: number;
  /** Hours of required work marked done, from any week. */
  doneHours: number;
  /** Positive when ahead of plan. */
  deltaHours: number;
  totalHours: number;
}

/**
 * Compare finished work with the plan. Skipped items leave the plan entirely;
 * optional items never count.
 */
export function pace(
  items: readonly PaceItem[],
  statusById: Readonly<Record<string, string | undefined>>,
  currentWeek: number,
): Pace {
  let expectedHours = 0;
  let doneHours = 0;
  let totalHours = 0;
  for (const item of items) {
    if (item.optional) continue;
    const status = statusById[item.id];
    if (status === "skipped") continue;
    totalHours += item.estHours;
    if (item.week < currentWeek) expectedHours += item.estHours;
    if (status === "done") doneHours += item.estHours;
  }
  return { expectedHours, doneHours, deltaHours: doneHours - expectedHours, totalHours };
}

/** Consecutive active days ending today, or yesterday if today has no activity yet. */
export function streak(activeDays: Iterable<string>, today: string): number {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export interface DayMinutes {
  day: string;
  minutes: number;
}

/** Minutes for each of the seven days (Monday first) of the week containing `today`. */
export function weekDays(minutesByDay: Readonly<Record<string, number | undefined>>, today: string): DayMinutes[] {
  const monday = startOfWeek(today);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    return { day, minutes: minutesByDay[day] ?? 0 };
  });
}

export function formatHours(minutes: number): string {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}
