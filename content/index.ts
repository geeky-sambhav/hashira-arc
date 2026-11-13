import type { Curriculum, Item, Module, Phase, QuizCard } from "./types";
import * as p00 from "./phases/00-base-camp";
import * as p01 from "./phases/01-processes";

const sources = [p00, p01];

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
