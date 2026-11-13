import type { Curriculum, Item, Module, Phase, QuizCard } from "./types";
import * as p00 from "./phases/00-base-camp";
import * as p01 from "./phases/01-processes";
import * as p02 from "./phases/02-runtimes";
import * as p03 from "./phases/03-memory";
import * as p04 from "./phases/04-storage";
import * as p05 from "./phases/05-networking";
import * as p06 from "./phases/06-isolation";
import * as p07 from "./phases/07-virtualization";
import * as c1 from "./phases/08-capstone-migration";
import * as p08 from "./phases/09-data";
import * as p09 from "./phases/10-distributed";
import { buffer1 } from "./phases/buffers";

const sources = [p00, p01, p02, p03, p04, p05, p06, p07, c1, buffer1, p08, p09];

export const curriculum: Curriculum = {
  totalWeeks: 52,
  weeklyHoursBudget: 25,
  phases: sources.map((s) => s.phase),
  cards: sources.flatMap((s) => s.quiz),
  retiredIds: [],
};

export const phases = curriculum.phases;

export interface ItemEntry {
  item: Item;
  module: Module;
  phase: Phase;
}

export const phaseById: ReadonlyMap<string, Phase> = new Map(phases.map((p) => [p.id, p]));

export const moduleById: ReadonlyMap<string, { module: Module; phase: Phase }> = new Map(
  phases.flatMap((phase) => phase.modules.map((module) => [module.id, { module, phase }] as const)),
);

export const itemById: ReadonlyMap<string, ItemEntry> = new Map(
  phases.flatMap((phase) =>
    phase.modules.flatMap((module) => module.items.map((item) => [item.id, { item, module, phase }] as const)),
  ),
);

/** Every item in curriculum order. */
export const allItems: readonly ItemEntry[] = [...itemById.values()];

export const cardById: ReadonlyMap<string, QuizCard> = new Map(curriculum.cards.map((c) => [c.id, c]));

export function phaseItems(phase: Phase): Item[] {
  return phase.modules.flatMap((m) => m.items);
}

export function phaseHours(phase: Phase): number {
  return phaseItems(phase)
    .filter((i) => !i.optional)
    .reduce((sum, i) => sum + i.estHours, 0);
}

export function phaseForWeek(week: number): Phase | undefined {
  return phases.find((p) => week >= p.weeks.start && week <= p.weeks.end);
}
