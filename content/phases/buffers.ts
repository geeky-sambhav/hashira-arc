import { lab, note } from "../dsl";
import type { Phase, QuizCard } from "../types";

const buffer = (n: 1 | 2, week: number, looking: string): Phase => ({
  id: `buffer-${n}`,
  label: "Buffer",
  title: n === 1 ? "Catch up and consolidate" : "Catch up before the home stretch",
  summary: `A deliberately empty week. Finish anything unfinished, clear your review queue, and rest. ${looking}`,
  weeks: { start: week, end: week },
  buffer: true,
  modules: [
    {
      id: `buffer-${n}-week`,
      title: "This week",
      items: [
        lab(`buffer-${n}-retro`, "Retrospective", {
          week,
          hours: 2,
          brief:
            "Look back over the phases so far. Which labs changed how you think? Which topics still feel shaky? Pick at most three to revisit and adjust how you spend your weekly hours.",
          evidence: [note("retro", "What worked, what did not, and what you will change")],
        }),
        lab(`buffer-${n}-catch-up`, "Finish what is open", {
          week,
          hours: 20,
          optional: true,
          brief:
            "Work through every item still marked in progress or to do from earlier weeks. If you are fully caught up, redo your weakest lab from memory or take the week off.",
          evidence: [note("done", "What you closed out")],
        }),
      ],
    },
  ],
});

export const buffer1 = {
  phase: buffer(1, 29, "Next comes data and distributed systems, which lean on everything so far."),
  quiz: [] as QuizCard[],
};

export const buffer2 = {
  phase: buffer(2, 40, "Next come reliability, Kubernetes, and the AI infrastructure tracks."),
  quiz: [] as QuizCard[],
};
