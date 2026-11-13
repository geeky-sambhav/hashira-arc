import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import { db } from "./client";

export interface CardStateRow {
  cardId: string;
  dueOn: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export const getCardStates = cache(async (): Promise<CardStateRow[]> => {
  await io();
  const rows = await db()<
    { card_id: string; due_on: string; interval_days: number; ease: number; reps: number; lapses: number }[]
  >`
    select card_id, due_on::text as due_on, interval_days, ease, reps, lapses from card_state`;
  return rows.map((r) => ({
    cardId: r.card_id,
    dueOn: r.due_on,
    intervalDays: r.interval_days,
    ease: r.ease,
    reps: r.reps,
    lapses: r.lapses,
  }));
});

/** How many new cards were first seen on `day`. */
export const getIntroducedCount = cache(async (day: string): Promise<number> => {
  await io();
  const rows = await db()<{ n: number }[]>`
    select count(*)::int as n from card_state where introduced_on = ${day}::date`;
  return rows[0]?.n ?? 0;
});

/** Days with any study activity (logged time or a review) on or after `since`. */
export const getActiveDays = cache(async (since: string): Promise<string[]> => {
  await io();
  const rows = await db()<{ day: string }[]>`
    select logged_on::text as day from time_log where logged_on >= ${since}::date
    union
    select reviewed_on::text as day from review_log where reviewed_on >= ${since}::date`;
  return rows.map((r) => r.day);
});

export const getReviewCountOn = cache(async (day: string): Promise<number> => {
  await io();
  const rows = await db()<{ n: number }[]>`
    select count(*)::int as n from review_log where reviewed_on = ${day}::date`;
  return rows[0]?.n ?? 0;
});
