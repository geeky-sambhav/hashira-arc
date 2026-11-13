import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { phaseById, phaseHours, phases } from "@/content";
import { Skeleton } from "@/components/progress-bar";
import { ItemRow } from "@/components/roadmap/item-row";
import { LivePhaseProgress } from "@/components/roadmap/live";

export function generateStaticParams() {
  return phases.map((p) => ({ phaseId: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/roadmap/[phaseId]">): Promise<Metadata> {
  const { phaseId } = await params;
  return { title: phaseById.get(phaseId)?.title ?? "Roadmap" };
}

export default function PhasePage({ params }: PageProps<"/roadmap/[phaseId]">) {
  return (
    <Suspense fallback={<PhaseSkeleton />}>{params.then(({ phaseId }) => <PhaseView phaseId={phaseId} />)}</Suspense>
  );
}

function PhaseView({ phaseId }: { phaseId: string }) {
  const phase = phaseById.get(phaseId);
  if (!phase) notFound();

  const index = phases.indexOf(phase);
  const prev = phases[index - 1];
  const next = phases[index + 1];
  const weeks =
    phase.weeks.start === phase.weeks.end
      ? `Week ${phase.weeks.start}`
      : `Weeks ${phase.weeks.start}-${phase.weeks.end}`;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link
          href="/roadmap"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          Roadmap
        </Link>
        <div className="flex flex-col gap-2">
          <p className="tabular text-sm font-medium text-primary">
            {phase.label} · {weeks} · {phaseHours(phase)}h
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{phase.title}</h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">{phase.summary}</p>
        </div>
        <div className="max-w-md">
          <Suspense fallback={<Skeleton className="h-1.5 w-full rounded-full" />}>
            <LivePhaseProgress phase={phase} />
          </Suspense>
        </div>
      </header>

      {phase.modules.map((mod) => (
        <section key={mod.id} aria-labelledby={`${mod.id}-title`} className="flex flex-col gap-2">
          <div className="px-2 sm:px-3">
            <h2 id={`${mod.id}-title`} className="font-heading text-lg font-semibold tracking-tight">
              {mod.title}
            </h2>
            {mod.summary && <p className="text-sm text-muted-foreground">{mod.summary}</p>}
          </div>
          <ul className="flex flex-col rounded-2xl border bg-card p-1.5 shadow-xs">
            {mod.items.map((item) => (
              <ItemRow key={item.id} item={item} phaseId={phase.id} />
            ))}
          </ul>
        </section>
      ))}

      <nav aria-label="Phases" className="grid gap-3 border-t pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/roadmap/${prev.id}`}
            className="group flex flex-col gap-0.5 rounded-xl border p-4 outline-none hover:bg-foreground/[0.035] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowLeftIcon className="size-3 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              Previous
            </span>
            <span className="font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/roadmap/${next.id}`}
            className="group flex flex-col items-end gap-0.5 rounded-xl border p-4 text-right outline-none hover:bg-foreground/[0.035] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Next
              <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
            <span className="font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

function PhaseSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
