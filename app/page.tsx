import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon } from "lucide-react";
import { HoursTile, PaceTile, Pillars, PlanHero, ReviewTile, StreakTile, UpNext } from "@/components/dashboard/cards";
import { Skeleton } from "@/components/progress-bar";

function TileSkeleton() {
  return <Skeleton className="h-[168px] rounded-2xl" />;
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<Skeleton className="h-52 rounded-3xl" />}>
        <PlanHero />
      </Suspense>

      <section aria-label="This week at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Suspense fallback={<TileSkeleton />}>
          <HoursTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton />}>
          <ReviewTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton />}>
          <PaceTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton />}>
          <StreakTile />
        </Suspense>
      </section>

      <section aria-labelledby="next-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between px-2 sm:px-3">
          <h2 id="next-title" className="font-heading text-lg font-semibold tracking-tight">
            Up next
          </h2>
          <Link
            href="/roadmap"
            className="group inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Full roadmap
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <UpNext />
        </Suspense>
      </section>

      <section aria-labelledby="pillars-title" className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-xs sm:p-8">
        <div>
          <h2 id="pillars-title" className="font-heading text-lg font-semibold tracking-tight">
            The nine pillars
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            Hashira means pillar. Each core subject fills as you finish its work.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
          <Pillars />
        </Suspense>
      </section>
    </div>
  );
}
