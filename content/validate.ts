import {
  DETAIL_MAX_LENGTH,
  ID_MAX_LENGTH,
  ID_PATTERN,
  MAX_DEPTH,
  SEGMENT_MAX_LENGTH,
  SEGMENT_PATTERN,
  TITLE_MAX_LENGTH,
  type Section,
  type SheetNode,
} from "./types";

export interface ValidationReport {
  errors: string[];
  stats: {
    sections: number;
    groups: number;
    concepts: number;
    builds: number;
    leaves: number;
    links: number;
    maxDepth: number;
  };
}

/** Check the authored sheet for mistakes the type system cannot see. */
export function validateSheet(sections: readonly Section[]): ValidationReport {
  const errors: string[] = [];
  const stats = { sections: sections.length, groups: 0, concepts: 0, builds: 0, leaves: 0, links: 0, maxDepth: 0 };
  const ids = new Set<string>();
  const linkUrls = new Set<string>();

  const claim = (id: string, what: string) => {
    if (ids.has(id)) errors.push(`${what} "${id}": ID already used`);
    ids.add(id);
  };

  const visit = (node: SheetNode, depth: number) => {
    const at = `"${node.id}"`;
    claim(node.id, "node");
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    const segment = node.id.slice(node.id.lastIndexOf(".") + 1);
    if (!SEGMENT_PATTERN.test(segment)) errors.push(`${at}: ID segment "${segment}" must be lower-case kebab-case`);
    if (segment.length > SEGMENT_MAX_LENGTH) errors.push(`${at}: ID segment is over ${SEGMENT_MAX_LENGTH} characters`);
    if (!ID_PATTERN.test(node.id) || node.id.length > ID_MAX_LENGTH) errors.push(`${at}: invalid full ID`);
    if (depth > MAX_DEPTH) errors.push(`${at}: nested ${depth} levels deep, the limit is ${MAX_DEPTH}`);

    const title = node.title.trim();
    if (!title) errors.push(`${at}: empty title`);
    if (title !== node.title) errors.push(`${at}: title has leading or trailing whitespace`);
    if (title.length > TITLE_MAX_LENGTH) errors.push(`${at}: title is over ${TITLE_MAX_LENGTH} characters`);
    if (node.detail !== undefined) {
      if (!node.detail.trim()) errors.push(`${at}: empty detail`);
      if (node.detail.length > DETAIL_MAX_LENGTH) errors.push(`${at}: detail is over ${DETAIL_MAX_LENGTH} characters`);
    }

    const urls = new Set<string>();
    for (const l of node.links ?? []) {
      stats.links += 1;
      linkUrls.add(l.url);
      if (!l.label.trim()) errors.push(`${at}: link with empty label`);
      const problem = linkProblem(l.url);
      if (problem) errors.push(`${at}: link "${l.url}" ${problem}`);
      if (urls.has(l.url)) errors.push(`${at}: duplicate link ${l.url}`);
      urls.add(l.url);
    }

    for (const line of node.doneWhen ?? []) {
      if (!line.trim()) errors.push(`${at}: empty "done when" line`);
    }
    if (node.doneWhen && node.kind !== "build") errors.push(`${at}: only builds can have "done when" lines`);

    const children = node.children ?? [];
    if (children.length === 0) {
      // A leaf: the thing you actually tick.
      stats.leaves += 1;
      if (node.kind === "topic") errors.push(`${at}: a topic needs rows under it`);
      if (node.kind === "concept") stats.concepts += 1;
      if (node.kind === "build") stats.builds += 1;
      if (!node.detail) errors.push(`${at}: a row you tick needs a detail saying what done means`);
      if (node.leaves !== 1) errors.push(`${at}: leaf count is wrong`);
      return;
    }

    stats.groups += 1;
    if (node.kind !== "topic" && children.length < 2) {
      errors.push(`${at}: a row split into parts needs at least two parts`);
    }
    checkSiblings(children, at, errors);
    let leaves = 0;
    for (const child of children) {
      visit(child, depth + 1);
      leaves += child.leaves;
    }
    if (node.leaves !== leaves) errors.push(`${at}: leaf count is wrong`);
  };

  for (const s of sections) {
    const at = `section "${s.id}"`;
    claim(s.id, "section");
    if (!SEGMENT_PATTERN.test(s.id) || s.id.length > SEGMENT_MAX_LENGTH) errors.push(`${at}: invalid ID`);
    if (!s.title.trim()) errors.push(`${at}: empty title`);
    if (!s.summary.trim()) errors.push(`${at}: empty summary`);
    if (s.children.length === 0) errors.push(`${at}: has no topics`);
    checkSiblings(s.children, at, errors);
    let leaves = 0;
    for (const child of s.children) {
      if (child.kind !== "topic") errors.push(`"${child.id}": the top level of a section must be topics`);
      visit(child, 2);
      leaves += child.leaves;
    }
    if (s.leaves !== leaves) errors.push(`${at}: leaf count is wrong`);
  }

  stats.links = linkUrls.size;
  return { errors, stats };
}

function checkSiblings(children: readonly SheetNode[], at: string, errors: string[]) {
  const titles = new Set<string>();
  for (const child of children) {
    const key = child.title.trim().toLowerCase();
    if (titles.has(key)) errors.push(`${at}: two children are both titled "${child.title}"`);
    titles.add(key);
  }
}

export function linkProblem(url: string): string | null {
  if (/\s/.test(url)) return "contains whitespace";
  if (/[.,;)]$/.test(url)) return "ends with punctuation";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "does not parse";
  }
  if (parsed.protocol !== "https:") return "is not https";
  return null;
}
