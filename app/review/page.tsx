import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BrainIcon, LockIcon, SparklesIcon } from "lucide-react";
import { moduleById } from "@/content";
import { Skeleton } from "@/components/progress-bar";
import { ReviewSession, type SessionCard } from "@/components/review/review-session";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import { getReviewData } from "@/lib/db/review";

export const metadata: Metadata = { title: "Review" };

function EmptyState({
  icon: Icon,
  title,
  children,
  href,
  cta,
}: {
  icon: typeof BrainIcon;
  title: string;
  children: React.ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-dashed p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-pretty text-muted-foreground">{children}</p>
      <Button variant="outline" asChild>
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

async function Review() {
  const data = await getReviewData();
  const { queue, today } = data;

  if (queue.due.length + queue.fresh.length === 0) {
    if (data.startedModules === 0) {
      return (
        <EmptyState icon={LockIcon} title="No cards unlocked yet" href="/roadmap" cta="Go to the roadmap">
          Quiz cards unlock module by module. Mark any item as in progress or done and that module&apos;s cards appear
          here, a few new ones each day.
        </EmptyState>
      );
    }
    return (
      <EmptyState icon={SparklesIcon} title="All caught up" href="/" cta="Back to today">
        {data.nextDueOn
          ? `Nothing is due today. Your next card comes back on ${formatDay(data.nextDueOn)}.`
          : "Nothing is due today."}
        {queue.waiting > 0 &&
          ` ${queue.waiting} new ${queue.waiting === 1 ? "card is" : "cards are"} held for tomorrow by your daily limit.`}
      </EmptyState>
    );
  }

  const toSession = (isNew: boolean) => (card: (typeof queue.due)[number]): SessionCard => ({
    id: card.id,
    question: card.question,
    answer: card.answer,
    topic: moduleById.get(card.moduleId)?.module.title ?? "",
    isNew,
    prev: data.scheduleByCard.get(card.id) ?? null,
  });
  const cards = [...queue.due.map(toSession(false)), ...queue.fresh.map(toSession(true))];

  // Keyed by the queue so a fresh visit never resumes a stale session.
  return <ReviewSession key={cards.map((c) => c.id).join(",")} cards={cards} today={today} waiting={queue.waiting} />;
}

export default function ReviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="mx-auto flex w-full max-w-2xl flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Review</h1>
        <p className="text-pretty text-muted-foreground">
          Ten minutes a day. Cards you find hard come back sooner; cards you know drift further apart.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
        }
      >
        <Review />
      </Suspense>
    </div>
  );
}
