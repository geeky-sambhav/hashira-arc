import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import type { EvidenceKind } from "@/content/types";
import { db } from "./client";
import { getSnapshot } from "./snapshot";

export interface EvidenceEntry {
  id: string;
  checklistId: string | null;
  kind: EvidenceKind;
  body: string | null;
  url: string | null;
  createdAt: string;
}

export interface ItemState {
  evidence: EvidenceEntry[];
  /** Total minutes logged against this item. */
  minutes: number;
}

/** Everything the item page needs beyond the snapshot, in one round trip. */
export const getItemState = cache(async (itemId: string): Promise<ItemState> => {
  await io();
  const rows = await db()<{ state: ItemState }[]>`
    select json_build_object(
      'evidence', coalesce(
        (select json_agg(json_build_object(
            'id', id::text, 'checklistId', checklist_id, 'kind', kind, 'body', body, 'url', url,
            'createdAt', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
            order by created_at desc, id desc)
           from lab_evidence where item_id = ${itemId}), '[]'::json),
      'minutes', coalesce((select sum(minutes)::int from time_log where item_id = ${itemId}), 0)
    ) as state`;
  return rows[0]?.state ?? { evidence: [], minutes: 0 };
});

/** item ID -> number of evidence entries. */
export async function getEvidenceCounts(): Promise<Readonly<Record<string, number | undefined>>> {
  return (await getSnapshot()).evidenceCounts;
}
