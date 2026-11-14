"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useState,
} from "react";
import { ChevronsDownUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { toast } from "sonner";
import type { Section, SheetNode } from "@/content/types";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { saveChecks, saveNote, setStarred } from "@/lib/actions/sheet";
import { useOpenSet } from "@/lib/sheet/open-store";
import { applyPatch, groupToggle, type SheetState } from "@/lib/sheet/state";
import { defaultOpen, doneCounts, groupIds, isLeaf, leafIdsUnder, someLeaf } from "@/lib/sheet/tree";
import { createCheckQueue } from "@/lib/sheet/write-queue";
import { cn } from "@/lib/utils";
import { TopicCard } from "./rows";

export type Filter = "all" | "todo" | "starred";

interface SheetContextValue {
  state: SheetState;
  /** Ticked leaves under each group. */
  counts: ReadonlyMap<string, number>;
  filter: Filter;
  isOpen(id: string): boolean;
  toggleOpen(id: string): void;
  /** The leaf whose detail panel is showing. */
  detailId: string | null;
  setDetailId(id: string | null): void;
  /** The box the learner just ticked, so only that one plays the ignite animation. */
  justTicked: string | null;
  isVisible(node: SheetNode): boolean;
  toggleLeaf(node: SheetNode): void;
  toggleGroup(node: SheetNode): void;
  toggleStar(node: SheetNode): void;
  writeNote(node: SheetNode, text: string): Promise<boolean>;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheet(): SheetContextValue {
  const value = useContext(SheetContext);
  if (!value) throw new Error("useSheet must be used inside <SheetTree>");
  return value;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "todo", label: "To do" },
  { id: "starred", label: "Starred" },
];

/**
 * One section as an interactive checklist. The server passes what is saved;
 * every click updates the screen at once and is saved in the background.
 */
export function SheetTree({
  section,
  done,
  starred,
  notes,
}: {
  section: Section;
  done: readonly string[];
  starred: readonly string[];
  notes: Readonly<Record<string, string>>;
}) {
  const saved = useMemo<SheetState>(
    () => ({ done: new Set(done), starred: new Set(starred), notes }),
    [done, starred, notes],
  );
  const [state, apply] = useOptimistic(saved, applyPatch);
  const [queue] = useState(() => createCheckQueue(saveChecks));

  // Computed once from the first render so groups do not move while you tick.
  const [defaults] = useState(() => defaultOpen(section, new Set(done)));
  const [open, openControls] = useOpenSet(section.id, defaults);
  const [filter, setFilter] = useState<Filter>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [justTicked, setJustTicked] = useState<string | null>(null);

  const counts = useMemo(() => doneCounts(section, state.done), [section, state.done]);
  const ticked = counts.get(section.id) ?? 0;
  const allGroups = useMemo(() => groupIds(section), [section]);

  const check = useCallback(
    (on: readonly string[], off: readonly string[]) => {
      startTransition(async () => {
        apply({ type: "check", on, off });
        const result = await queue.enqueue(on, off);
        if (!result.ok) toast.error(result.error);
      });
    },
    [apply, queue],
  );

  const toggleLeaf = useCallback(
    (node: SheetNode) => {
      const isDone = state.done.has(node.id);
      setJustTicked(isDone ? null : node.id);
      check(isDone ? [] : [node.id], isDone ? [node.id] : []);
    },
    [check, state.done],
  );

  const toggleGroup = useCallback(
    (node: SheetNode) => {
      const { on, off } = groupToggle(leafIdsUnder(node), state.done);
      setJustTicked(on.length > 0 ? node.id : null);
      check(on, off);
      const n = on.length + off.length;
      toast(`${on.length > 0 ? "Ticked" : "Cleared"} ${n} ${n === 1 ? "row" : "rows"} in "${node.title}"`, {
        action: { label: "Undo", onClick: () => check(off, on) },
      });
    },
    [check, state.done],
  );

  const toggleStar = useCallback(
    (node: SheetNode) => {
      const next = !state.starred.has(node.id);
      startTransition(async () => {
        apply({ type: "star", id: node.id, starred: next });
        const result = await setStarred(node.id, next);
        if (!result.ok) toast.error(result.error);
      });
    },
    [apply, state.starred],
  );

  const writeNote = useCallback(
    (node: SheetNode, text: string) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          apply({ type: "note", id: node.id, text });
          const result = await saveNote(node.id, text);
          if (!result.ok) toast.error(result.error);
          resolve(result.ok);
        });
      }),
    [apply],
  );

  const isVisible = useCallback(
    (node: SheetNode) => {
      if (filter === "all") return true;
      if (filter === "todo") return someLeaf(node, (id) => !state.done.has(id));
      return someLeaf(node, (id) => state.starred.has(id));
    },
    [filter, state.done, state.starred],
  );

  const value = useMemo<SheetContextValue>(
    () => ({
      state,
      counts,
      filter,
      // A filter shows matches wherever they are, so everything is treated as open.
      isOpen: (id) => filter !== "all" || open.has(id),
      toggleOpen: openControls.toggle,
      detailId,
      setDetailId,
      justTicked,
      isVisible,
      toggleLeaf,
      toggleGroup,
      toggleStar,
      writeNote,
    }),
    [state, counts, filter, open, openControls, detailId, justTicked, isVisible, toggleLeaf, toggleGroup, toggleStar, writeNote],
  );

  const visibleTopics = section.children.filter(isVisible);
  const pct = section.leaves > 0 ? Math.floor((ticked / section.leaves) * 100) : 0;
  const complete = ticked === section.leaves;

  return (
    <SheetContext.Provider value={value}>
      <div className="flex flex-col gap-4">
        <div className="sticky top-[62px] z-30 -mx-4 border-b bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <ProgressBar value={ticked / section.leaves} label={`${section.title} progress`} className="h-2" />
              <p className="tabular shrink-0 text-sm">
                <span className="font-semibold">{ticked}</span>
                <span className="text-muted-foreground">
                  /{section.leaves} · {pct}%
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div role="radiogroup" aria-label="Show rows" className="flex gap-1 rounded-lg bg-muted p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "tabular rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                      filter === f.id && "bg-background text-foreground shadow-xs",
                    )}
                  >
                    {f.label}
                    {f.id === "todo" && ` ${section.leaves - ticked}`}
                    {f.id === "starred" && ` ${state.starred.size}`}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={filter !== "all"}
                  onClick={() => openControls.openAll(allGroups)}
                >
                  <ChevronsUpDownIcon />
                  Expand all
                </Button>
                <Button variant="ghost" size="sm" disabled={filter !== "all"} onClick={() => openControls.closeAll()}>
                  <ChevronsDownUpIcon />
                  Collapse all
                </Button>
              </div>
            </div>
          </div>
        </div>

        {complete && (
          <p className="flex items-center gap-3 rounded-2xl border border-haori/40 bg-haori/10 p-4 text-sm">
            <span aria-hidden="true" className="ichimatsu size-6 shrink-0 rounded-sm" />
            <span>
              <span className="font-semibold">Form mastered.</span> Every row here is ticked, and this pillar now
              stands.
            </span>
          </p>
        )}

        {visibleTopics.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {filter === "starred"
              ? "No starred rows in this form yet. Star a row to come back to it."
              : "Nothing left to do here."}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {section.children.map((topic, i) =>
              isVisible(topic) && !isLeaf(topic) ? <TopicCard key={topic.id} node={topic} index={i + 1} /> : null,
            )}
          </ol>
        )}
      </div>
    </SheetContext.Provider>
  );
}
