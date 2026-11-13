import { EVIDENCE_KINDS, ID_MAX_LENGTH, ID_PATTERN, type Curriculum, type Item } from "./types";

export interface ValidationReport {
  errors: string[];
  stats: {
    phases: number;
    modules: number;
    items: number;
    cards: number;
    requiredHours: number;
    optionalHours: number;
    hoursByWeek: number[];
  };
}

const QUESTION_MAX = 300;
const ANSWER_MAX = 600;

/** Check the authored curriculum for mistakes the type system cannot see. */
export function validateCurriculum(c: Curriculum): ValidationReport {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  const retired = new Set(c.retiredIds);

  const checkId = (id: string, what: string) => {
    if (!ID_PATTERN.test(id) || id.length > ID_MAX_LENGTH) errors.push(`${what} "${id}": invalid ID`);
    if (retired.has(id)) errors.push(`${what} "${id}": reuses a retired ID`);
    const prior = seen.get(id);
    if (prior) errors.push(`${what} "${id}": ID already used by ${prior}`);
    else seen.set(id, what);
  };

  if (c.totalWeeks < 48 || c.totalWeeks > 52) errors.push(`totalWeeks ${c.totalWeeks} is outside 48-52`);

  const requiredByWeek = new Array<number>(c.totalWeeks + 1).fill(0);
  const bufferWeeks = new Set<number>();
  let optionalHours = 0;
  let modules = 0;
  let items = 0;
  const moduleIds = new Set<string>();

  let expectedStart = 1;
  for (const phase of c.phases) {
    checkId(phase.id, "phase");
    const { start, end } = phase.weeks;
    if (start !== expectedStart) errors.push(`phase "${phase.id}": starts at week ${start}, expected ${expectedStart}`);
    if (end < start) errors.push(`phase "${phase.id}": ends before it starts`);
    expectedStart = end + 1;
    if (phase.buffer) for (let w = start; w <= end; w++) bufferWeeks.add(w);
    if (phase.modules.length === 0) errors.push(`phase "${phase.id}": has no modules`);

    for (const mod of phase.modules) {
      modules += 1;
      checkId(mod.id, "module");
      moduleIds.add(mod.id);
      if (mod.items.length === 0) errors.push(`module "${mod.id}": has no items`);

      for (const item of mod.items) {
        items += 1;
        checkId(item.id, "item");
        checkItem(item, start, end, errors);
        if (item.optional) optionalHours += item.estHours;
        else if (item.week >= 1 && item.week <= c.totalWeeks) requiredByWeek[item.week] += item.estHours;
      }
    }
  }
  if (expectedStart !== c.totalWeeks + 1) {
    errors.push(`phases cover weeks 1-${expectedStart - 1}, expected 1-${c.totalWeeks}`);
  }

  const ceiling = c.weeklyHoursBudget * 1.4;
  for (let w = 1; w <= c.totalWeeks; w++) {
    const hours = requiredByWeek[w];
    if (hours === 0 && !bufferWeeks.has(w)) errors.push(`week ${w}: no required work planned`);
    if (hours > ceiling) errors.push(`week ${w}: ${hours}h planned, over the ${ceiling}h ceiling`);
  }

  const questions = new Set<string>();
  for (const card of c.cards) {
    checkId(card.id, "card");
    if (!moduleIds.has(card.moduleId)) errors.push(`card "${card.id}": unknown module "${card.moduleId}"`);
    const q = card.question.trim();
    const a = card.answer.trim();
    if (!q || q.length > QUESTION_MAX) errors.push(`card "${card.id}": question must be 1-${QUESTION_MAX} chars`);
    if (!a || a.length > ANSWER_MAX) errors.push(`card "${card.id}": answer must be 1-${ANSWER_MAX} chars`);
    if (questions.has(q.toLowerCase())) errors.push(`card "${card.id}": duplicate question`);
    questions.add(q.toLowerCase());
  }

  return {
    errors,
    stats: {
      phases: c.phases.length,
      modules,
      items,
      cards: c.cards.length,
      requiredHours: requiredByWeek.reduce((a, b) => a + b, 0),
      optionalHours,
      hoursByWeek: requiredByWeek.slice(1),
    },
  };
}

function checkItem(item: Item, start: number, end: number, errors: string[]) {
  const at = `item "${item.id}"`;
  if (!item.title.trim()) errors.push(`${at}: empty title`);
  if (!Number.isInteger(item.week) || item.week < start || item.week > end) {
    errors.push(`${at}: week ${item.week} is outside its phase (${start}-${end})`);
  }
  if (!(item.estHours > 0) || !Number.isInteger(item.estHours * 4)) {
    errors.push(`${at}: estHours must be a positive multiple of 0.25`);
  }

  const urls = new Set<string>();
  for (const l of item.links ?? []) {
    if (!l.label.trim()) errors.push(`${at}: link with empty label`);
    const problem = linkProblem(l.url);
    if (problem) errors.push(`${at}: link "${l.url}" ${problem}`);
    if (urls.has(l.url)) errors.push(`${at}: duplicate link ${l.url}`);
    urls.add(l.url);
  }

  if (item.kind === "reading") {
    if (!item.source.trim()) errors.push(`${at}: reading has no source`);
    if (!item.links?.length) errors.push(`${at}: reading has no link`);
    return;
  }

  if (!item.brief.trim()) errors.push(`${at}: empty brief`);
  if (item.evidence.length === 0) errors.push(`${at}: needs at least one evidence spec`);
  const evidenceIds = new Set<string>();
  for (const e of item.evidence) {
    if (!ID_PATTERN.test(e.id) || e.id.length > ID_MAX_LENGTH) errors.push(`${at}: evidence ID "${e.id}" is invalid`);
    if (evidenceIds.has(e.id)) errors.push(`${at}: duplicate evidence ID "${e.id}"`);
    evidenceIds.add(e.id);
    if (!e.label.trim()) errors.push(`${at}: evidence "${e.id}" has no label`);
    if (!EVIDENCE_KINDS.includes(e.kind)) errors.push(`${at}: evidence "${e.id}" has an unknown kind`);
  }
  if (item.kind === "project" && item.deliverables.length === 0) errors.push(`${at}: project has no deliverables`);
}

function linkProblem(url: string): string | null {
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
