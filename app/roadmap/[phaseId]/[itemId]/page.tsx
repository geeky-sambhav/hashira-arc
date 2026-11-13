import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import { allItems, itemById, type ItemEntry } from "@/content";
import { TimeLogForm } from "@/components/log/time-log-form";
import { Skeleton } from "@/components/progress-bar";
import { EvidenceBoard } from "@/components/roadmap/evidence-board";
import { formatItemHours, kindMeta } from "@/components/roadmap/kind";
import { LiveItemStatusSegmented } from "@/components/roadmap/live";
import { getItemState } from "@/lib/db/evidence";
import { getToday } from "@/lib/db/settings";
import { formatHours } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return allItems.map(({ item, phase }) => ({ phaseId: phase.id, itemId: item.id }));
}

export async function generateMetadata({ params }: PageProps<"/roadmap/[phaseId]/[itemId]">): Promise<Metadata> {
  const { itemId } = await params;
  return { title: itemById.get(itemId)?.item.title ?? "Item" };
}

export default function ItemPage({ params }: PageProps<"/roadmap/[phaseId]/[itemId]">) {
  return (
    <Suspense fallback={<ItemSkeleton />}>
      {params.then(({ phaseId, itemId }) => {
        const entry = itemById.get(itemId);
        if (!entry || entry.phase.id !== phaseId) notFound();
        return <ItemView entry={entry} />;
      })}
    </Suspense>
  );
}

async function Evidence({ entry }: { entry: ItemEntry }) {
  const { evidence } = await getItemState(entry.item.id);
  const specs = entry.item.kind === "reading" ? [] : entry.item.evidence;
  return <EvidenceBoard itemId={entry.item.id} specs={specs} entries={evidence} />;
}

async function TimeOnItem({ itemId }: { itemId: string }) {
  const [{ minutes }, today] = await Promise.all([getItemState(itemId), getToday()]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {minutes > 0 ? (
          <>
            <span className="tabular font-medium text-foreground">{formatHours(minutes)}h</span> logged on this item so
            far.
          </>
        ) : (
          "No time logged on this item yet."
        )}
      </p>
      <TimeLogForm today={today} fixedItemId={itemId} />
    </div>
  );
}

function ItemView({ entry }: { entry: ItemEntry }) {
  const { item, module: mod, phase } = entry;
  const meta = kindMeta(item);
  const index = allItems.indexOf(entry);
  const prev = allItems[index - 1];
  const next = allItems[index + 1];

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/roadmap" className="rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            Roadmap
          </Link>
          <ChevronRightIcon className="size-3.5" aria-hidden="true" />
          <Link
            href={`/roadmap/${phase.id}`}
            className="rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {phase.title}
          </Link>
        </nav>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", meta.tone)}>
              <meta.icon className="size-3.5" aria-hidden="true" />
              {meta.label}
            </span>
            <span className="tabular rounded-full border px-2.5 py-1 text-muted-foreground">Week {item.week}</span>
            <span className="tabular rounded-full border px-2.5 py-1 text-muted-foreground">
              about {formatItemHours(item.estHours)}
            </span>
            {item.optional && <span className="rounded-full border px-2.5 py-1 text-muted-foreground">Optional</span>}
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">{item.title}</h1>
          <p className="text-sm text-muted-foreground">{mod.title}</p>
        </div>

        <Suspense fallback={<Skeleton className="h-10 w-full max-w-md rounded-xl" />}>
          <LiveItemStatusSegmented itemId={item.id} />
        </Suspense>
      </header>

      <section aria-labelledby="todo-title" className="flex flex-col gap-3">
        <h2 id="todo-title" className="font-heading text-lg font-semibold tracking-tight">
          {item.kind === "reading" ? "What to study" : "What to do"}
        </h2>
        {item.kind === "reading" ? (
          <dl className="grid gap-3 rounded-2xl border bg-card p-4 text-sm shadow-xs sm:grid-cols-[auto_1fr] sm:gap-x-6">
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-medium">{item.source}</dd>
            {item.chapters && (
              <>
                <dt className="text-muted-foreground">Sections</dt>
                <dd className="text-pretty">{item.chapters}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="max-w-3xl leading-relaxed text-pretty">{item.brief}</p>
        )}
        {item.kind === "project" && (
          <div className="rounded-2xl border bg-card p-4 shadow-xs">
            <h3 className="text-sm font-medium">Done means</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-pretty marker:text-primary">
              {item.deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {item.links && item.links.length > 0 && (
        <section aria-labelledby="resources-title" className="flex flex-col gap-3">
          <h2 id="resources-title" className="font-heading text-lg font-semibold tracking-tight">
            Resources
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {item.links.map((l) => (
              <li key={l.url}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs transition-all outline-none hover:-translate-y-px hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-pretty">{l.label}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {new URL(l.url).hostname.replace(/^www\./, "")}
                      {l.paid && " · paid"}
                    </p>
                  </div>
                  <ExternalLinkIcon
                    className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
        <Evidence entry={entry} />
      </Suspense>

      <section aria-labelledby="time-title" className="flex flex-col gap-3">
        <h2 id="time-title" className="font-heading text-lg font-semibold tracking-tight">
          Time
        </h2>
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <Suspense fallback={<Skeleton className="h-28 w-full" />}>
            <TimeOnItem itemId={item.id} />
          </Suspense>
        </div>
      </section>

      <nav aria-label="Items" className="grid gap-3 border-t pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/roadmap/${prev.phase.id}/${prev.item.id}`}
            className="group flex flex-col gap-0.5 rounded-xl border p-4 outline-none hover:bg-foreground/[0.035] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowLeftIcon className="size-3 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              Previous
            </span>
            <span className="line-clamp-1 font-medium">{prev.item.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/roadmap/${next.phase.id}/${next.item.id}`}
            className="group flex flex-col items-end gap-0.5 rounded-xl border p-4 text-right outline-none hover:bg-foreground/[0.035] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Next
              <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
            <span className="line-clamp-1 font-medium">{next.item.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

function ItemSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-10 w-full max-w-md rounded-xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
