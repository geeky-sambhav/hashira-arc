import { describe, expect, test } from "bun:test";
import { curriculum } from "./index";
import type { Curriculum, Phase } from "./types";
import { validateCurriculum } from "./validate";

const COMPLETE = curriculum.phases.at(-1)?.weeks.end === curriculum.totalWeeks;

describe("curriculum", () => {
  const report = validateCurriculum(curriculum);

  test("has no validation errors", () => {
    // While the curriculum is still being authored the only tolerated error is week coverage.
    const errors = COMPLETE
      ? report.errors
      : report.errors.filter((e) => !e.startsWith("phases cover weeks") && !e.endsWith("no required work planned"));
    expect(errors).toEqual([]);
  });

  test("prints its size", () => {
    const { stats } = report;
    console.log(
      `${stats.phases} phases, ${stats.modules} modules, ${stats.items} items, ${stats.cards} cards, ` +
        `${stats.requiredHours}h required + ${stats.optionalHours}h optional`,
    );
    expect(stats.items).toBeGreaterThan(0);
  });
});

describe("validateCurriculum catches mistakes", () => {
  const phase = (over: Partial<Phase> = {}): Phase => ({
    id: "p",
    label: "Phase",
    title: "T",
    summary: "S",
    weeks: { start: 1, end: 48 },
    modules: [
      {
        id: "m",
        title: "M",
        items: Array.from({ length: 48 }, (_, i) => ({
          kind: "reading" as const,
          id: `item-${i + 1}`,
          title: "Read",
          week: i + 1,
          estHours: 5,
          source: "Book",
          links: [{ label: "Book", url: "https://example.com/book" }],
        })),
      },
    ],
    ...over,
  });
  const make = (over: Partial<Curriculum> = {}): Curriculum => ({
    totalWeeks: 48,
    weeklyHoursBudget: 25,
    phases: [phase()],
    cards: [],
    retiredIds: [],
    ...over,
  });

  test("a clean fixture passes", () => {
    expect(validateCurriculum(make()).errors).toEqual([]);
  });

  test("duplicate IDs", () => {
    const p = phase();
    const dup = { ...p.modules[0], items: [...p.modules[0].items, { ...p.modules[0].items[0] }] };
    const { errors } = validateCurriculum(make({ phases: [{ ...p, modules: [dup] }] }));
    expect(errors.some((e) => e.includes("already used"))).toBe(true);
  });

  test("bad links", () => {
    const p = phase();
    const items = p.modules[0].items.map((it, i) =>
      i === 0 ? { ...it, links: [{ label: "x", url: "http://insecure.example.com" }] } : it,
    );
    const { errors } = validateCurriculum(make({ phases: [{ ...p, modules: [{ ...p.modules[0], items }] }] }));
    expect(errors.some((e) => e.includes("is not https"))).toBe(true);
  });

  test("a week with no work, and an item outside its phase", () => {
    const p = phase();
    const items = p.modules[0].items.map((it, i) => (i === 4 ? { ...it, week: 60 } : it));
    const { errors } = validateCurriculum(make({ phases: [{ ...p, modules: [{ ...p.modules[0], items }] }] }));
    expect(errors.some((e) => e.includes("week 5: no required work"))).toBe(true);
    expect(errors.some((e) => e.includes("outside its phase"))).toBe(true);
  });

  test("gaps between phases, retired IDs and orphan cards", () => {
    const { errors } = validateCurriculum(
      make({
        phases: [phase({ weeks: { start: 2, end: 48 } })],
        retiredIds: ["m"],
        cards: [{ id: "c-q1", moduleId: "nope", question: "Q?", answer: "A" }],
      }),
    );
    expect(errors.some((e) => e.includes("starts at week 2"))).toBe(true);
    expect(errors.some((e) => e.includes("retired"))).toBe(true);
    expect(errors.some((e) => e.includes("unknown module"))).toBe(true);
  });
});
