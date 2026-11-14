import type { Section, SheetNode } from "./types";
import baseCamp from "./sections/01-base-camp";
import processes from "./sections/02-processes";
import runtimes from "./sections/03-runtimes";
import memory from "./sections/04-memory";
import storage from "./sections/05-storage";
import networking from "./sections/06-networking";
import isolation from "./sections/07-isolation";
import virtualization from "./sections/08-virtualization";
import capstoneMigration from "./sections/09-capstone-migration";
import data from "./sections/10-data";
import distributed from "./sections/11-distributed";
import reliability from "./sections/12-reliability";
import kubernetes from "./sections/13-kubernetes";
import capstonePlatform from "./sections/14-capstone-platform";
import inference from "./sections/15-inference";
import voice from "./sections/16-voice";

/** The sheet, in the order it is meant to be worked through. */
export const sections: readonly Section[] = [
  baseCamp,
  processes,
  runtimes,
  memory,
  storage,
  networking,
  isolation,
  virtualization,
  capstoneMigration,
  data,
  distributed,
  reliability,
  kubernetes,
  capstonePlatform,
  inference,
  voice,
];

export const sectionById: ReadonlyMap<string, Section> = new Map(sections.map((s) => [s.id, s]));

export interface NodeEntry {
  node: SheetNode;
  section: Section;
}

function collect(): { nodes: Map<string, NodeEntry>; leaves: Set<string> } {
  const nodes = new Map<string, NodeEntry>();
  const leaves = new Set<string>();
  const walk = (node: SheetNode, s: Section) => {
    nodes.set(node.id, { node, section: s });
    if (node.children?.length) node.children.forEach((child) => walk(child, s));
    else leaves.add(node.id);
  };
  for (const s of sections) s.children.forEach((child) => walk(child, s));
  return { nodes, leaves };
}

const collected = collect();

/** Every node in the sheet, groups included. */
export const nodeById: ReadonlyMap<string, NodeEntry> = collected.nodes;

/** The IDs that carry a checkbox. */
export const leafIds: ReadonlySet<string> = collected.leaves;

export const totalLeaves = sections.reduce((n, s) => n + s.leaves, 0);
