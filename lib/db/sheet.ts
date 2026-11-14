import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import { db } from "./client";

/** Everything the sheet stores about you, for the whole sheet or for one section. */
export interface SheetSnapshot {
  /** Ticked row IDs. */
  done: string[];
  /** Rows marked to revisit. */
  starred: string[];
  /** Personal notes by row ID. Only loaded when a section is given. */
  notes: Record<string, string>;
}

/**
 * One round trip per page: the database may be hundreds of milliseconds away.
 * Pass a section ID to load only that section's rows (and its notes), or null
 * for the ticked rows of the whole sheet.
 */
export const getSheetSnapshot = cache(async (sectionId: string | null): Promise<SheetSnapshot> => {
  await io(); // keep the query, and the connection, out of every prerender
  // Section IDs are [a-z0-9-], so the prefix holds no LIKE wildcards.
  const prefix = sectionId === null ? "%" : `${sectionId}.%`;
  const rows = await db()<{ state: SheetSnapshot }[]>`
    select json_build_object(
      'done', coalesce(
        (select json_agg(node_id) from sheet_state where done and node_id like ${prefix}), '[]'::json),
      'starred', coalesce(
        (select json_agg(node_id) from sheet_state where starred and node_id like ${prefix}), '[]'::json),
      'notes', coalesce(
        (select json_object_agg(node_id, note) from sheet_state
          where note is not null and ${sectionId !== null} and node_id like ${prefix}), '{}'::json)
    ) as state`;
  const state = rows[0]?.state;
  if (!state) throw new Error("Could not read sheet_state. Re-run the migrations in supabase/migrations.");
  return state;
});
