import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import type { ItemStatus } from "@/content/types";
import { db } from "./client";

export type ProgressMap = Readonly<Record<string, ItemStatus | undefined>>;

/** item ID -> status for every item that is not in the default "todo" state. */
export const getProgressMap = cache(async (): Promise<ProgressMap> => {
  await io();
  const rows = await db()<{ item_id: string; status: ItemStatus }[]>`
    select item_id, status from item_progress where status <> 'todo'`;
  return Object.fromEntries(rows.map((r) => [r.item_id, r.status]));
});
