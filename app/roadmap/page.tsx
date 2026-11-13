import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon, CoffeeIcon, TrophyIcon } from "lucide-react";
import { allItems, curriculum, phaseHours, phases } from "@/content";
import type { Phase } from "@/content/types";
import { ProgressBar, Skeleton } from "@/components/progress-bar";
import { LivePhaseProgress } from "@/components/roadmap/live";
import { getPlan } from "@/lib/db/plan";
import { getProgressMap } from "@/lib/db/progress";
import { pace } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Roadmap" };

const paceItems = allItems.map(({ item }) => item);

async function OverallProgress() {
  const p = pace(paceItems, await getProgressMap(), 1);
  const ratio = p.totalHours > 0 ? p.doneHours / p.totalHours : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          <span className="tabular text-2xl font-semibold tracking-tight">{Math.round(ratio * 100)}%</span> complete
        </span>
        <span className="tabular text-muted-foreground">
          {Math.round(p.doneHours)} of {Math.round(p.totalHours)} hours
        </span>
      </div>
      <ProgressBar value={ratio} label="Overall progress" className="h-2" />
    </div>
  );
}

async function NowBadge({ phase }: { phase: Phase }) {
  const { position } = await getPlan();
  if (position.state !== "active") return null;
  if (position.week < phase.weeks.start || position.week > phase.weeks.end) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
      <span className="size-1.5 animate-pulse rounded-full bg-primary-foreground" />
      Week {position.week}
    </span>
  );
}

function weeksLabel(phase: Phase) {
  const { start, end } = phase.weeks;
  return start === end ? `Week ${start}` : `Weeks ${start}-${end}`;
}

function PhaseCard({ phase }: { phase: Phase }) {
  const itemCount = phase.modules.reduce((n, m) => n + m.items.length, 0);
  const Icon = phase.capstone ? TrophyIcon : phase.buffer ? CoffeeIcon : null;
  return (
    <li className="relative pl-8 sm:pl-10">
      {/* timeline node */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-6 left-0 grid size-5 -translate-x-[2px] place-items-center rounded-full border-2 bg-background sm:left-1",
          phase.capstone ? "border-primary" : "border-muted-foreground/30",
        )}
      >
        <span className={cn("size-1.5 rounded-full", phase.capstone ? "bg-primary" : "bg-muted-foreground/40")} />
      </span>
      <Link
        href={`/roadmap/${phase.id}`}
        className={cn(
          "group flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-all outline-none hover:-translate-y-px hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5",
          phase.capstone && "border-primary/40 bg-linear-to-br from-primary/[0.07] to-transparent",
          phase.buffer && "border-dashed bg-transparent shadow-none",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
              {Icon && <Icon className={cn("size-3.5", phase.capstone && "text-primary")} aria-hidden="true" />}
              <span className={cn(phase.capstone && "text-primary")}>{phase.label}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular">{weeksLabel(phase)}</span>
              <Suspense fallback={null}>
                <NowBadge phase={phase} />
              </Suspense>
            </div>
            <h2 className="mt-1 font-heading text-lg font-semibold tracking-tight text-balance">{phase.title}</h2>
            {!phase.buffer && <p className="mt-1 line-clamp-2 text-sm text-pretty text-muted-foreground">{phase.summary}</p>}
          </div>
          <ChevronRightIcon
            className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <Suspense fallback={<Skeleton className="h-1.5 w-full rounded-full" />}>
              <LivePhaseProgress phase={phase} />
            </Suspense>
          </div>
          <span className="tabular shrink-0 text-xs text-muted-foreground">
            {itemCount} items · {phaseHours(phase)}h
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function RoadmapPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Roadmap</h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            {curriculum.totalWeeks} weeks from the shell to sandboxes, distributed systems and AI infrastructure. Every
            phase ends in something you built and can show.
          </p>
        </div>
        <div className="max-w-md">
          <Suspense fallback={<Skeleton className="h-12 w-full" />}>
            <OverallProgress />
          </Suspense>
        </div>
      </header>

      <ol className="relative flex flex-col gap-3 before:absolute before:top-6 before:bottom-6 before:left-[7px] before:w-px before:bg-border sm:before:left-[11px]">
        {phases.map((phase) => (
          <PhaseCard key={phase.id} phase={phase} />
        ))}
      </ol>
    </div>
  );
}
