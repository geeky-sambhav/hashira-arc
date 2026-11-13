"use server";

import { refresh } from "next/cache";
import { itemById } from "@/content";
import { EVIDENCE_KINDS, type EvidenceKind } from "@/content/types";
import { db } from "@/lib/db/client";
import { EVIDENCE_BODY_MAX, EVIDENCE_URL_MAX, NOTE_MAX, failure, type ActionResult } from "./types";

export interface EvidenceInput {
  itemId: string;
  checklistId: string | null;
  kind: EvidenceKind;
  body: string;
  url: string;
}

export async function addEvidence(input: EvidenceInput): Promise<ActionResult> {
  const entry = itemById.get(input.itemId);
  if (!entry || !EVIDENCE_KINDS.includes(input.kind)) return { ok: false, error: "Unknown item or evidence type." };

  const specs = entry.item.kind === "reading" ? [] : entry.item.evidence;
  const checklistId = input.checklistId && specs.some((s) => s.id === input.checklistId) ? input.checklistId : null;

  const body = input.body.trim();
  const url = input.url.trim();

  if (input.kind === "link") {
    if (!/^https?:\/\/\S+$/.test(url) || url.length > EVIDENCE_URL_MAX) {
      return { ok: false, error: "Enter a full link starting with http:// or https://." };
    }
    if (body.length > NOTE_MAX) return { ok: false, error: `Keep the link description under ${NOTE_MAX} characters.` };
  } else {
    if (!body) return { ok: false, error: "Paste or type something first." };
    if (body.length > EVIDENCE_BODY_MAX) {
      return {
        ok: false,
        error: `That is ${body.length.toLocaleString("en-US")} characters; the limit is ${EVIDENCE_BODY_MAX.toLocaleString("en-US")}. Trim it or link to a gist.`,
      };
    }
  }

  try {
    await db()`
      insert into lab_evidence (item_id, checklist_id, kind, body, url)
      values (
        ${input.itemId},
        ${checklistId},
        ${input.kind},
        ${input.kind === "link" ? body || null : body},
        ${input.kind === "link" ? url : null}
      )`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteEvidence(id: string): Promise<ActionResult> {
  if (!/^\d{1,18}$/.test(id)) return { ok: false, error: "Unknown evidence entry." };
  try {
    await db()`delete from lab_evidence where id = ${id}::bigint`;
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { ok: true };
}
