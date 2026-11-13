import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import type { EvidenceKind } from "@/content/types";
import { db } from "./client";

export interface EvidenceEntry {
  id: string;
  itemId: string;
  checklistId: string | null;
  kind: EvidenceKind;
  body: string | null;
  url: string | null;
  createdAt: string;
}

export const getEvidenceForItem = cache(async (itemId: string): Promise<EvidenceEntry[]> => {
  await io();
  const rows = await db()<
    {
      id: string;
      item_id: string;
      checklist_id: string | null;
      kind: EvidenceKind;
      body: string | null;
      url: string | null;
      created_at: string;
    }[]
  >`
    select id::text as id, item_id, checklist_id, kind, body, url,
           to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
    from lab_evidence
    where item_id = ${itemId}
    order by created_at desc`;
  return rows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    checklistId: r.checklist_id,
    kind: r.kind,
    body: r.body,
    url: r.url,
    createdAt: r.created_at,
  }));
});

/** item ID -> number of evidence entries. */
export const getEvidenceCounts = cache(async (): Promise<Readonly<Record<string, number | undefined>>> => {
  await io();
  const rows = await db()<{ item_id: string; n: number }[]>`
    select item_id, count(*)::int as n from lab_evidence group by item_id`;
  return Object.fromEntries(rows.map((r) => [r.item_id, r.n]));
});
