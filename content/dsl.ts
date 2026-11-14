import type { NodeKind, ResourceLink, Section, SheetNode } from "./types";

/** Small constructors that keep the section files compact. */

export const link = (label: string, url: string): ResourceLink => ({ label, url });
export const paid = (label: string, url: string): ResourceLink => ({ label, url, paid: true });

/** A node as authored: a local ID, resolved to a full dotted ID by `section()`. */
export interface NodeSpec {
  local: string;
  title: string;
  kind: NodeKind;
  detail?: string;
  doneWhen?: readonly string[];
  links?: readonly ResourceLink[];
  children?: readonly NodeSpec[];
}

interface GroupOptions {
  /** One line on what the group covers. */
  detail?: string;
  /** Where to learn everything in the group. */
  links?: readonly ResourceLink[];
}

interface RowOptions {
  links?: readonly ResourceLink[];
  /** Break a hard row into checkable sub-rows. The row itself then has no checkbox. */
  parts?: readonly NodeSpec[];
}

interface BuildOptions extends RowOptions {
  /** The observable proof that the build works. */
  doneWhen?: readonly string[];
}

/** A group of rows: a topic, a subtopic, or a "Build it" list. */
export function topic(id: string, title: string, children: readonly NodeSpec[], o: GroupOptions = {}): NodeSpec {
  return {
    local: id,
    title,
    kind: "topic",
    children,
    ...(o.detail ? { detail: o.detail } : {}),
    ...(o.links?.length ? { links: o.links } : {}),
  };
}

/** Something to understand. `detail` says what you can explain once it is ticked. */
export function concept(id: string, title: string, detail?: string, o: RowOptions = {}): NodeSpec {
  return {
    local: id,
    title,
    kind: "concept",
    ...(detail ? { detail } : {}),
    ...(o.links?.length ? { links: o.links } : {}),
    ...(o.parts?.length ? { children: o.parts } : {}),
  };
}

/** Something to make or break with your own hands. `detail` is the brief. */
export function build(id: string, title: string, detail: string, o: BuildOptions = {}): NodeSpec {
  return {
    local: id,
    title,
    kind: "build",
    detail,
    ...(o.doneWhen?.length ? { doneWhen: o.doneWhen } : {}),
    ...(o.links?.length ? { links: o.links } : {}),
    ...(o.parts?.length ? { children: o.parts } : {}),
  };
}

function resolve(spec: NodeSpec, parentId: string): SheetNode {
  const id = `${parentId}.${spec.local}`;
  const children = spec.children?.map((child) => resolve(child, id));
  return {
    id,
    title: spec.title,
    kind: spec.kind,
    ...(spec.detail ? { detail: spec.detail } : {}),
    ...(spec.doneWhen ? { doneWhen: spec.doneWhen } : {}),
    ...(spec.links ? { links: spec.links } : {}),
    ...(children?.length ? { children } : {}),
    leaves: children?.length ? children.reduce((n, c) => n + c.leaves, 0) : 1,
  };
}

/** One subject of the sheet. Resolves every node's full ID and leaf count. */
export function section(
  id: string,
  meta: { title: string; summary: string; capstone?: boolean },
  children: readonly NodeSpec[],
): Section {
  const resolved = children.map((child) => resolve(child, id));
  return {
    id,
    title: meta.title,
    summary: meta.summary,
    ...(meta.capstone ? { capstone: true } : {}),
    children: resolved,
    leaves: resolved.reduce((n, c) => n + c.leaves, 0),
  };
}
