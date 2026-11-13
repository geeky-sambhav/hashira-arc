import Link from "next/link";
import { Suspense } from "react";
import type { Item } from "@/content/types";
import { Skeleton } from "@/components/progress-bar";
import { KindIcon, formatItemHours } from "./kind";
import { LiveEvidenceCount, LiveItemStatus } from "./live";

function subtitle(item: Item): string {
  if (item.kind === "reading") return item.chapters ? `${item.source} · ${item.chapters}` : item.source;
  return item.brief;
}

/** One curriculum item in a list. Static markup; only the status streams in. */
export function ItemRow({ item, phaseId, showWeek = true }: { item: Item; phaseId: string; showWeek?: boolean }) {
  return (
    <li className="group/row relative flex items-start gap-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-foreground/[0.035] sm:gap-3 sm:px-3">
      <div className="flex h-9 w-[62px] shrink-0 items-center">
        <Suspense fallback={<Skeleton className="ml-1.5 size-6 rounded-full" />}>
          <LiveItemStatus itemId={item.id} />
        </Suspense>
      </div>
      <KindIcon item={item} className="mt-0.5 hidden sm:grid" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/roadmap/${phaseId}/${item.id}`}
          className="block rounded-md outline-none after:absolute after:inset-y-0 after:right-0 after:left-[78px] after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          <span className="font-medium text-pretty transition-colors group-has-data-[status=done]/row:text-muted-foreground group-has-data-[status=skipped]/row:text-muted-foreground group-has-data-[status=skipped]/row:line-through">
            {item.title}
          </span>
          {item.optional && (
            <span className="ml-2 rounded-full border px-1.5 py-px align-middle text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Optional
            </span>
          )}
        </Link>
        <p className="mt-0.5 line-clamp-2 text-sm text-pretty text-muted-foreground">{subtitle(item)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5 text-xs text-muted-foreground">
        <span className="tabular">
          {showWeek && <>W{item.week} · </>}
          {formatItemHours(item.estHours)}
        </span>
        <Suspense fallback={null}>
          <LiveEvidenceCount itemId={item.id} />
        </Suspense>
      </div>
    </li>
  );
}
