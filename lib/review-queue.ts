export interface QueueCard {
  id: string;
  moduleId: string;
}

export interface QueueInput<C extends QueueCard> {
  /** All cards, in curriculum order. */
  cards: readonly C[];
  /** card ID -> due date for every card that has been introduced. */
  dueOnByCard: ReadonlyMap<string, string>;
  /** Modules with at least one item started or finished. */
  startedModuleIds: ReadonlySet<string>;
  today: string;
  newCardsPerDay: number;
  /** New cards already introduced today. */
  introducedToday: number;
}

export interface Queue<C extends QueueCard> {
  /** Previously seen cards that are due, oldest first. */
  due: C[];
  /** Unseen cards from started modules, capped by the daily limit. */
  fresh: C[];
  /** Unseen, unlocked cards held back by the daily limit. */
  waiting: number;
}

/**
 * Decide what to review today. New cards unlock only once their module has been
 * started, and are rationed per day so the queue never opens with hundreds of cards.
 */
export function buildQueue<C extends QueueCard>(input: QueueInput<C>): Queue<C> {
  const due: C[] = [];
  const unlocked: C[] = [];

  for (const card of input.cards) {
    const dueOn = input.dueOnByCard.get(card.id);
    if (dueOn !== undefined) {
      if (dueOn <= input.today) due.push(card);
    } else if (input.startedModuleIds.has(card.moduleId)) {
      unlocked.push(card);
    }
  }

  due.sort((a, b) => {
    const da = input.dueOnByCard.get(a.id) ?? "";
    const db = input.dueOnByCard.get(b.id) ?? "";
    return da < db ? -1 : da > db ? 1 : 0;
  });

  const allowance = Math.max(0, input.newCardsPerDay - input.introducedToday);
  return {
    due,
    fresh: unlocked.slice(0, allowance),
    waiting: Math.max(0, unlocked.length - allowance),
  };
}
