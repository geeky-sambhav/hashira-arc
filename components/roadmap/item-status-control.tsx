"use client";

import { startTransition, useOptimistic } from "react";
import { CheckIcon, ChevronDownIcon, MinusIcon } from "lucide-react";
import { toast } from "sonner";
import type { ItemStatus } from "@/content/types";
import { setItemStatus } from "@/lib/actions/progress";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const STATUS_LABEL: Record<ItemStatus, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
  skipped: "Skipped",
};

const ORDER: ItemStatus[] = ["todo", "doing", "done", "skipped"];

/** The round mark shared by every status display. */
export function StatusMark({ status, className }: { status: ItemStatus; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-200",
        status === "todo" && "border-muted-foreground/35 group-hover/mark:border-success/70",
        status === "doing" && "border-warning bg-warning/15",
        status === "done" && "scale-100 border-success bg-success text-background",
        status === "skipped" && "border-dashed border-muted-foreground/40 text-muted-foreground",
        className,
      )}
    >
      {status === "done" && <CheckIcon className="size-3.5" strokeWidth={3.5} />}
      {status === "doing" && <span className="size-2 rounded-full bg-warning" />}
      {status === "skipped" && <MinusIcon className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

function useStatus(itemId: string, status: ItemStatus) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const change = (next: ItemStatus) => {
    if (next === optimistic) return;
    startTransition(async () => {
      setOptimistic(next);
      const result = await setItemStatus(itemId, next);
      if (!result.ok) toast.error(result.error);
    });
  };
  return [optimistic, change] as const;
}

/**
 * Compact control for list rows: click the circle to mark done (or undo),
 * open the menu for the less common states.
 */
export function ItemStatusControl({ itemId, title, status }: { itemId: string; title: string; status: ItemStatus }) {
  const [current, change] = useStatus(itemId, status);
  const toggleTo: ItemStatus = current === "done" || current === "skipped" ? "todo" : "done";

  return (
    <div data-status={current} className="flex items-center">
      <button
        type="button"
        onClick={() => change(toggleTo)}
        aria-label={toggleTo === "done" ? `Mark "${title}" as done` : `Mark "${title}" as not done`}
        aria-pressed={current === "done"}
        className="group/mark grid size-9 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90"
      >
        <StatusMark status={current} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Change status of "${title}" (currently ${STATUS_LABEL[current]})`}
          className="grid size-6 place-items-center rounded-md text-muted-foreground/60 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40">
          <DropdownMenuRadioGroup value={current} onValueChange={(v) => change(v as ItemStatus)}>
            {ORDER.map((s) => (
              <DropdownMenuRadioItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Full-width segmented control for the item detail page. */
export function ItemStatusSegmented({ itemId, status }: { itemId: string; status: ItemStatus }) {
  const [current, change] = useStatus(itemId, status);
  return (
    <div
      role="radiogroup"
      aria-label="Status"
      data-status={current}
      className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 sm:inline-grid sm:auto-cols-fr sm:grid-flow-col"
    >
      {ORDER.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={current === s}
          onClick={() => change(s)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            current === s && "bg-background text-foreground shadow-sm",
          )}
        >
          <StatusMark status={s} className="hidden size-4 border-[1.5px] sm:grid [&_svg]:size-2.5 [&>span]:size-1.5" />
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
