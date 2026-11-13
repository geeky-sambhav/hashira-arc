import { addDays } from "./dates";

/** 1 = again, 2 = hard, 3 = good, 4 = easy. */
export const GRADES = [1, 2, 3, 4] as const;
export type Grade = (typeof GRADES)[number];

export interface CardSchedule {
  dueOn: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 3650;

const clampEase = (ease: number) => Math.max(MIN_EASE, Math.round(ease * 100) / 100);
const clampInterval = (days: number) => Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));

/**
 * SM-2 style scheduler with four grades.
 *
 * - again: the card is due again today (the session requeues it) and counts as a lapse
 *   if it had been learned before.
 * - hard / good / easy: the interval grows by a factor that depends on the card's ease.
 *
 * `prev` is null for a card that has never been reviewed.
 */
export function schedule(prev: CardSchedule | null, grade: Grade, today: string): CardSchedule {
  const ease = prev?.ease ?? INITIAL_EASE;
  const reps = prev?.reps ?? 0;
  const lapses = prev?.lapses ?? 0;
  const interval = prev?.intervalDays ?? 0;

  if (grade === 1) {
    return {
      dueOn: today,
      intervalDays: 0,
      ease: clampEase(ease - 0.2),
      reps: 0,
      lapses: reps > 0 ? lapses + 1 : lapses,
    };
  }

  let nextEase = ease;
  let nextInterval: number;

  if (grade === 2) {
    nextEase = clampEase(ease - 0.15);
    nextInterval = reps === 0 ? 1 : Math.max(interval + 1, interval * 1.2);
  } else if (grade === 3) {
    nextInterval = reps === 0 ? 1 : reps === 1 ? 3 : interval * ease;
  } else {
    nextEase = clampEase(ease + 0.15);
    nextInterval = reps === 0 ? 4 : Math.max(interval + 1, interval * ease * 1.3);
  }

  const intervalDays = clampInterval(nextInterval);
  return {
    dueOn: addDays(today, intervalDays),
    intervalDays,
    ease: nextEase,
    reps: reps + 1,
    lapses,
  };
}
