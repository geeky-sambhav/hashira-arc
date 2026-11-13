import type {
  EvidenceKind,
  EvidenceSpec,
  LabItem,
  ProjectItem,
  QuizCard,
  ReadingItem,
  ResourceLink,
} from "./types";

/** Small constructors that keep the curriculum files compact. */

export const link = (label: string, url: string): ResourceLink => ({ label, url });
export const paid = (label: string, url: string): ResourceLink => ({ label, url, paid: true });

const ev =
  (kind: EvidenceKind) =>
  (id: string, label: string): EvidenceSpec => ({ id, label, kind });
export const output = ev("output");
export const note = ev("note");
export const url = ev("link");

interface Common {
  week: number;
  hours: number;
  optional?: boolean;
  links?: readonly ResourceLink[];
}

export function read(
  id: string,
  title: string,
  o: Common & { source: string; chapters?: string },
): ReadingItem {
  return {
    kind: "reading",
    id,
    title,
    week: o.week,
    estHours: o.hours,
    source: o.source,
    ...(o.chapters ? { chapters: o.chapters } : {}),
    ...(o.optional ? { optional: true } : {}),
    ...(o.links ? { links: o.links } : {}),
  };
}

export function lab(
  id: string,
  title: string,
  o: Common & { brief: string; evidence: readonly EvidenceSpec[] },
): LabItem {
  return {
    kind: "lab",
    id,
    title,
    week: o.week,
    estHours: o.hours,
    brief: o.brief,
    evidence: o.evidence,
    ...(o.optional ? { optional: true } : {}),
    ...(o.links ? { links: o.links } : {}),
  };
}

export function project(
  id: string,
  title: string,
  o: Common & {
    brief: string;
    deliverables: readonly string[];
    evidence: readonly EvidenceSpec[];
    capstone?: boolean;
  },
): ProjectItem {
  return {
    kind: "project",
    id,
    title,
    week: o.week,
    estHours: o.hours,
    brief: o.brief,
    deliverables: o.deliverables,
    evidence: o.evidence,
    ...(o.capstone ? { capstone: true } : {}),
    ...(o.optional ? { optional: true } : {}),
    ...(o.links ? { links: o.links } : {}),
  };
}

/**
 * Build the quiz cards for one module. IDs are derived from the module ID and
 * position, so append new cards at the end and never reorder existing ones.
 */
export function cards(moduleId: string, pairs: readonly (readonly [string, string])[]): QuizCard[] {
  return pairs.map(([question, answer], i) => ({
    id: `${moduleId}-q${i + 1}`,
    moduleId,
    question,
    answer,
  }));
}
