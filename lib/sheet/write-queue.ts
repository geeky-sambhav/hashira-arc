/**
 * Coalesces rapid checkbox clicks into as few server round trips as possible.
 *
 * Server Actions run one at a time per client, and each one re-renders the
 * route. Ten quick ticks would otherwise be ten sequential round trips. Here
 * the first change is sent at once; changes made while it is in flight are
 * merged (last write per ID wins) and sent together when it settles.
 */

export type CheckResult = { ok: true } | { ok: false; error: string };
export type SendChecks = (on: string[], off: string[]) => Promise<CheckResult>;

export interface CheckQueue {
  /** Resolves when the batch carrying these changes has been saved (or failed). */
  enqueue(on: readonly string[], off: readonly string[]): Promise<CheckResult>;
}

export function createCheckQueue(send: SendChecks): CheckQueue {
  let inFlight = false;
  let pending: Map<string, boolean> | null = null;
  let pendingResult: Promise<CheckResult> | null = null;
  let resolvePending: ((result: CheckResult) => void) | null = null;

  const run = async (changes: Map<string, boolean>): Promise<CheckResult> => {
    inFlight = true;
    const on: string[] = [];
    const off: string[] = [];
    for (const [id, checked] of changes) (checked ? on : off).push(id);
    let result: CheckResult;
    try {
      result = await send(on, off);
    } catch {
      result = { ok: false, error: "Could not save that. Check your connection and try again." };
    }
    inFlight = false;
    flush();
    return result;
  };

  const flush = () => {
    if (!pending || !resolvePending) return;
    const changes = pending;
    const resolve = resolvePending;
    pending = null;
    pendingResult = null;
    resolvePending = null;
    void run(changes).then(resolve);
  };

  return {
    enqueue(on, off) {
      const changes = new Map<string, boolean>();
      for (const id of on) changes.set(id, true);
      for (const id of off) changes.set(id, false);
      if (changes.size === 0) return Promise.resolve({ ok: true });
      if (!inFlight) return run(changes);

      pending ??= new Map();
      for (const [id, checked] of changes) pending.set(id, checked);
      pendingResult ??= new Promise<CheckResult>((resolve) => {
        resolvePending = resolve;
      });
      return pendingResult;
    },
  };
}
