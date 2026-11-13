import { PaperclipIcon } from "lucide-react";
import { itemById, phaseItems } from "@/content";
import type { Phase } from "@/content/types";
import { ProgressBar } from "@/components/progress-bar";
import { getEvidenceCounts } from "@/lib/db/evidence";
import { getProgressMap, type ProgressMap } from "@/lib/db/progress";
import { ItemStatusControl, ItemStatusSegmented } from "./item-status-control";

/**
 * Async server components that read user state. Each one must be rendered
 * inside <Suspense>: the static shell ships the fallback and these stream in.
 */

export async function LiveItemStatus({ itemId }: { itemId: string }) {
  const progress = await getProgressMap();
  const title = itemById.get(itemId)?.item.title ?? itemId;
  return <ItemStatusControl itemId={itemId} title={title} status={progress[itemId] ?? "todo"} />;
}

export async function LiveItemStatusSegmented({ itemId }: { itemId: string }) {
  const progress = await getProgressMap();
  return <ItemStatusSegmented itemId={itemId} status={progress[itemId] ?? "todo"} />;
}

export function phaseProgress(phase: Phase, progress: ProgressMap) {
  let total = 0;
  let done = 0;
  let doneCount = 0;
  let count = 0;
  for (const item of phaseItems(phase)) {
    if (item.optional) continue;
    const status = progress[item.id];
    if (status === "skipped") continue;
    total += item.estHours;
    count += 1;
    if (status === "done") {
      done += item.estHours;
      doneCount += 1;
    }
  }
  return { total, done, count, doneCount, ratio: total > 0 ? done / total : 0 };
}

export async function LivePhaseProgress({ phase, showText = true }: { phase: Phase; showText?: boolean }) {
  const p = phaseProgress(phase, await getProgressMap());
  return (
    <div className="flex items-center gap-3">
      <ProgressBar value={p.ratio} label={`${phase.title} progress`} tone={p.ratio >= 1 ? "success" : "ember"} />
      {showText && (
        <span className="tabular shrink-0 text-xs text-muted-foreground">
          {p.doneCount}/{p.count}
        </span>
      )}
    </div>
  );
}

export async function LiveEvidenceCount({ itemId }: { itemId: string }) {
  const counts = await getEvidenceCounts();
  const n = counts[itemId];
  if (!n) return null;
  return (
    <span className="tabular inline-flex items-center gap-1 text-xs text-muted-foreground" title={`${n} evidence entries`}>
      <PaperclipIcon className="size-3" aria-hidden="true" />
      {n}
      <span className="sr-only"> evidence entries</span>
    </span>
  );
}
