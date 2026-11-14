import type { Section, SheetNode } from "@/content/types";

/** Pure helpers over the sheet tree. No I/O, safe on server and client. */

export const isLeaf = (node: SheetNode): boolean => !node.children?.length;

/** IDs of every checkbox at or below a node. */
export function leafIdsUnder(node: SheetNode, out: string[] = []): string[] {
  if (isLeaf(node)) out.push(node.id);
  else for (const child of node.children ?? []) leafIdsUnder(child, out);
  return out;
}

/** IDs of every group (node with children) in a section, in document order. */
export function groupIds(section: Section): string[] {
  const out: string[] = [];
  const walk = (node: SheetNode) => {
    if (isLeaf(node)) return;
    out.push(node.id);
    node.children?.forEach(walk);
  };
  section.children.forEach(walk);
  return out;
}

/**
 * How many leaves are ticked under each group, in one post-order pass.
 * Leaves are not in the map; look them up in `done` directly.
 */
export function doneCounts(section: Section, done: ReadonlySet<string>): Map<string, number> {
  const counts = new Map<string, number>();
  const walk = (node: SheetNode): number => {
    if (isLeaf(node)) return done.has(node.id) ? 1 : 0;
    let n = 0;
    for (const child of node.children ?? []) n += walk(child);
    counts.set(node.id, n);
    return n;
  };
  let total = 0;
  for (const child of section.children) total += walk(child);
  counts.set(section.id, total);
  return counts;
}

/** Ticked leaves in one section. */
export function sectionDone(section: Section, done: ReadonlySet<string>): number {
  return doneCounts(section, done).get(section.id) ?? 0;
}

/**
 * The groups to show open by default: the path down to the first unticked row,
 * so the page opens where the learner left off.
 */
export function defaultOpen(section: Section, done: ReadonlySet<string>): string[] {
  const path: string[] = [];
  const walk = (nodes: readonly SheetNode[]): boolean => {
    for (const node of nodes) {
      if (isLeaf(node)) {
        if (!done.has(node.id)) return true;
        continue;
      }
      path.push(node.id);
      if (walk(node.children ?? [])) return true;
      path.pop();
    }
    return false;
  };
  if (!walk(section.children) && section.children[0]) return [section.children[0].id];
  // Stop at the subtopic: opening a row's own parts by default is noisy.
  return path.slice(0, 2);
}

/** True when a node or anything under it satisfies the predicate. */
export function someLeaf(node: SheetNode, test: (leafId: string) => boolean): boolean {
  if (isLeaf(node)) return test(node.id);
  return (node.children ?? []).some((child) => someLeaf(child, test));
}
