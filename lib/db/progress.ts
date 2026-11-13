import "server-only";
import type { ItemStatus } from "@/content/types";
import { getSnapshot } from "./snapshot";

export type ProgressMap = Readonly<Record<string, ItemStatus | undefined>>;

/** item ID -> status for every item that is not in the default "todo" state. */
export async function getProgressMap(): Promise<ProgressMap> {
  return (await getSnapshot()).progress;
}
