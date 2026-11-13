import "server-only";
import { getSnapshot, type Settings } from "./snapshot";

export type { Settings };

export async function getSettings(): Promise<Settings> {
  return (await getSnapshot()).settings;
}

/** Today's calendar day in the user's time zone. */
export async function getToday(): Promise<string> {
  return (await getSnapshot()).today;
}
