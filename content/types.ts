/**
 * The sheet is a tree: Section -> topics -> subtopics -> rows -> sub-rows.
 * Only leaves (nodes without children) carry a checkbox; every parent's
 * progress is computed from the leaves beneath it.
 */

/** `topic` groups rows, `concept` is something to understand, `build` is something to make. */
export type NodeKind = "topic" | "concept" | "build";

export interface ResourceLink {
  label: string;
  url: string;
  /** True when the resource costs money (a book, a paid course). */
  paid?: boolean;
}

export interface SheetNode {
  /** Dotted path from the section down, e.g. "networking.tcp.lifecycle.handshake". Never renamed once ticked. */
  id: string;
  title: string;
  kind: NodeKind;
  /** For a leaf: what you can explain or show once it is ticked. For a group: what it covers. */
  detail?: string;
  /** Builds only: the observable proof that it works. */
  doneWhen?: readonly string[];
  /** Where to learn it. */
  links?: readonly ResourceLink[];
  /** Present and non-empty on groups. A node with children has no checkbox of its own. */
  children?: readonly SheetNode[];
  /** Number of leaves at or below this node (1 for a leaf). */
  leaves: number;
}

export interface Section {
  id: string;
  title: string;
  summary: string;
  capstone?: boolean;
  children: readonly SheetNode[];
  leaves: number;
}

/** One dot-separated part of an ID. */
export const SEGMENT_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SEGMENT_MAX_LENGTH = 24;
/** Section + five levels below it. */
export const MAX_DEPTH = 6;
/** Shared with the CHECK constraint on sheet_state.node_id. */
export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/;
export const ID_MAX_LENGTH = 128;

export const TITLE_MAX_LENGTH = 110;
export const DETAIL_MAX_LENGTH = 700;
