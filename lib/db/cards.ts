import "server-only";
import { getSnapshot, type CardStateRow } from "./snapshot";

export type { CardStateRow };

export async function getCardStates(): Promise<CardStateRow[]> {
  return (await getSnapshot()).cards;
}

/** Days with any study activity (logged time or a review), most recent 400 days. */
export async function getActiveDays(): Promise<string[]> {
  return (await getSnapshot()).activeDays;
}
