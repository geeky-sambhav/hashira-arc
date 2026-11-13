export const ITEM_STATUSES = ["todo", "doing", "done", "skipped"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const EVIDENCE_KINDS = ["note", "output", "link"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/** The nine core subjects, shown as pillars on the dashboard. */
export const PILLARS = [
  { id: "os", label: "Processes & OS" },
  { id: "runtimes", label: "Runtimes" },
  { id: "memory", label: "Memory" },
  { id: "storage", label: "Storage" },
  { id: "networking", label: "Networking" },
  { id: "isolation", label: "Isolation" },
  { id: "data", label: "Data systems" },
  { id: "distributed", label: "Distributed" },
  { id: "reliability", label: "Reliability" },
] as const;
export type PillarId = (typeof PILLARS)[number]["id"];

export interface ResourceLink {
  label: string;
  url: string;
  /** True when the resource costs money (a book, a paid course). */
  paid?: boolean;
}

/** One piece of proof a lab asks you to capture. */
export interface EvidenceSpec {
  id: string;
  label: string;
  kind: EvidenceKind;
}

interface ItemBase {
  /** Globally unique, kebab-case, never renamed once progress exists for it. */
  id: string;
  title: string;
  /** Planned week, 1-based, inside the phase's week range. */
  week: number;
  /** Estimated hours, a positive multiple of 0.25. */
  estHours: number;
  /** Optional items are excluded from pace math. */
  optional?: boolean;
  links?: readonly ResourceLink[];
}

export interface ReadingItem extends ItemBase {
  kind: "reading";
  /** What to read or watch, e.g. "OSTEP" or "MIT 6.5840 lecture". */
  source: string;
  /** Chapter or section range, e.g. "ch. 4-6". */
  chapters?: string;
}

export interface LabItem extends ItemBase {
  kind: "lab";
  /** One or two sentences: what to build or break. */
  brief: string;
  evidence: readonly EvidenceSpec[];
}

export interface ProjectItem extends ItemBase {
  kind: "project";
  capstone?: boolean;
  brief: string;
  deliverables: readonly string[];
  evidence: readonly EvidenceSpec[];
}

export type Item = ReadingItem | LabItem | ProjectItem;
export type ItemKind = Item["kind"];

export interface Module {
  id: string;
  title: string;
  summary?: string;
  items: readonly Item[];
}

export interface Phase {
  id: string;
  /** Display label such as "Phase 3", "Capstone 1" or "Buffer". */
  label: string;
  title: string;
  summary: string;
  /** Inclusive week range. */
  weeks: { start: number; end: number };
  pillar?: PillarId;
  /** Buffer phases may have weeks with no required hours. */
  buffer?: boolean;
  capstone?: boolean;
  modules: readonly Module[];
}

export interface QuizCard {
  id: string;
  moduleId: string;
  question: string;
  answer: string;
}

export interface Curriculum {
  totalWeeks: number;
  weeklyHoursBudget: number;
  phases: readonly Phase[];
  cards: readonly QuizCard[];
  /** IDs that were used once and must never be reused. */
  retiredIds: readonly string[];
}

/** Shared with the database CHECK constraints. */
export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const ID_MAX_LENGTH = 80;
