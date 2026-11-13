import "server-only";
import { cache } from "react";
import { curriculum, phases } from "@/content";
import type { QuizCard } from "@/content/types";
import { buildQueue, type Queue } from "@/lib/review-queue";
import type { CardSchedule } from "@/lib/srs";
import { getSnapshot } from "./snapshot";

export interface ReviewData {
  today: string;
  queue: Queue<QuizCard>;
  /** Scheduling state for every card that has been seen. */
  scheduleByCard: Map<string, CardSchedule>;
  /** Earliest future due date, when nothing is due today. */
  nextDueOn: string | null;
  totalSeen: number;
  totalCards: number;
  /** Modules started so far; zero means no cards are unlocked yet. */
  startedModules: number;
}

export const getReviewData = cache(async (): Promise<ReviewData> => {
  const { today, settings, cards: states, progress } = await getSnapshot();
  const introducedToday = states.filter((s) => s.introducedOn === today).length;

  const startedModuleIds = new Set<string>();
  for (const phase of phases) {
    for (const mod of phase.modules) {
      if (mod.items.some((i) => progress[i.id] === "doing" || progress[i.id] === "done")) startedModuleIds.add(mod.id);
    }
  }

  const scheduleByCard = new Map<string, CardSchedule>(
    states.map((s) => [
      s.cardId,
      { dueOn: s.dueOn, intervalDays: s.intervalDays, ease: s.ease, reps: s.reps, lapses: s.lapses },
    ]),
  );
  const dueOnByCard = new Map(states.map((s) => [s.cardId, s.dueOn]));

  const queue = buildQueue({
    cards: curriculum.cards,
    dueOnByCard,
    startedModuleIds,
    today,
    newCardsPerDay: settings.newCardsPerDay,
    introducedToday,
  });

  let nextDueOn: string | null = null;
  for (const s of states) {
    if (s.dueOn > today && (nextDueOn === null || s.dueOn < nextDueOn)) nextDueOn = s.dueOn;
  }

  return {
    today,
    queue,
    scheduleByCard,
    nextDueOn,
    totalSeen: states.length,
    totalCards: curriculum.cards.length,
    startedModules: startedModuleIds.size,
  };
});
