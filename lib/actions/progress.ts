"use server";

import { refresh } from "next/cache";
import { itemById } from "@/content";
import { ITEM_STATUSES, type ItemStatus } from "@/content/types";
import { db } from "@/lib/db/client";
import { failure, type ActionResult } from "./types";

export async function setItemStatus(itemId: string, status: ItemStatus): Promise<ActionResult> {
  if (!itemById.has(itemId) || !ITEM_STATUSES.includes(status)) {
    return { ok: false, error: "Unknown item or status." };
  }
  try {
    await db()`
      insert into item_progress (item_id, status, completed_at)
      values (${itemId}, ${status}, case when ${status === "done"} then now() end)
      on conflict (item_id) do update set
        status = excluded.status,
        completed_at = case when excluded.status = 'done'
          then coalesce(item_progress.completed_at, excluded.completed_at) end,
        updated_at = now()`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}
