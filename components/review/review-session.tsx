"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2Icon, EyeIcon } from "lucide-react";
import { toast } from "sonner";
import { gradeCard } from "@/lib/actions/review";
import { schedule, type CardSchedule, type Grade } from "@/lib/srs";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";

export interface SessionCard {
  id: string;
  question: string;
  answer: string;
  topic: string;
  isNew: boolean;
  prev: CardSchedule | null;
}

const GRADES: { grade: Grade; label: string; hint: string; className: string }[] = [
  { grade: 1, label: "Again", hint: "Did not know it", className: "hover:border-destructive/60 hover:bg-destructive/10" },
  { grade: 2, label: "Hard", hint: "Got it with effort", className: "hover:border-warning/70 hover:bg-warning/10" },
  { grade: 3, label: "Good", hint: "Knew it", className: "hover:border-primary/70 hover:bg-primary/10" },
  { grade: 4, label: "Easy", hint: "Instant", className: "hover:border-success/70 hover:bg-success/10" },
];

function intervalLabel(days: number): string {
  if (days <= 0) return "soon";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function ReviewSession({ cards, today, waiting }: { cards: SessionCard[]; today: string; waiting: number }) {
  const router = useRouter();
  const [queue, setQueue] = useState(cards);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const total = cards.length;
  const current = queue[0];
  const finished = queue.length === 0;

  const grade = useCallback(
    (g: Grade) => {
      if (!current) return;
      const card = current;
      const next = schedule(card.prev, g, today);
      // Advance immediately; the save happens in the background.
      setQueue((q) => {
        const rest = q.slice(1);
        return g === 1 ? [...rest, { ...card, prev: next, isNew: false }] : rest;
      });
      setRevealed(false);
      if (g !== 1) setReviewed((n) => n + 1);

      void gradeCard(card.id, g).then((result) => {
        if (result.ok) return;
        toast.error(`${result.error} The card is back in your queue.`);
        setQueue((q) => (q.some((c) => c.id === card.id) ? q : [card, ...q]));
        if (g !== 1) setReviewed((n) => Math.max(0, n - 1));
      });
    },
    [current, today],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        grade(Number(e.key) as Grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  // Let the rest of the app see the new counts once the session ends.
  useEffect(() => {
    if (finished && total > 0) router.refresh();
  }, [finished, total, router]);

  if (finished) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border bg-card p-8 text-center shadow-xs">
        <CheckCircle2Icon className="size-12 text-success" aria-hidden="true" />
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Session complete</h2>
        <p className="text-pretty text-muted-foreground">
          You reviewed <span className="tabular font-medium text-foreground">{reviewed}</span>{" "}
          {reviewed === 1 ? "card" : "cards"}.
          {waiting > 0 && ` ${waiting} more new ${waiting === 1 ? "card is" : "cards are"} waiting for tomorrow.`}
        </p>
        <Button asChild>
          <Link href="/">Back to today</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <ProgressBar value={total > 0 ? reviewed / total : 0} label="Session progress" />
        <span className="tabular shrink-0 text-sm text-muted-foreground" aria-live="polite">
          {reviewed} / {total}
        </span>
      </div>

      <article
        key={`${current.id}-${queue.length}`}
        className="flex min-h-72 animate-in flex-col rounded-3xl border bg-card p-6 shadow-sm duration-300 fade-in slide-in-from-bottom-2 sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">{current.topic}</span>
          {current.isNew && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">New</span>}
        </div>
        <h2 className="mt-5 font-heading text-xl leading-snug font-medium text-pretty sm:text-2xl">{current.question}</h2>

        {revealed ? (
          <div className="mt-6 animate-in border-t pt-6 duration-200 fade-in" aria-live="polite">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Answer</p>
            <p className="mt-2 text-base leading-relaxed text-pretty">{current.answer}</p>
          </div>
        ) : (
          <div className="mt-auto flex flex-col items-start gap-2 pt-8">
            <Button size="lg" onClick={() => setRevealed(true)} autoFocus>
              <EyeIcon />
              Show answer
            </Button>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Say the answer to yourself first. Press <kbd className="rounded border px-1 font-mono">Space</kbd> to reveal.
            </p>
          </div>
        )}
      </article>

      {revealed && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">How well did you know it?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map(({ grade: g, label, hint, className }) => (
              <button
                key={g}
                type="button"
                onClick={() => grade(g)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-2xl border bg-card p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]",
                  className,
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="font-medium">{label}</span>
                  <kbd className="tabular hidden rounded border px-1.5 font-mono text-[11px] text-muted-foreground sm:inline">{g}</kbd>
                </span>
                <span className="text-xs text-muted-foreground">{hint}</span>
                <span className="tabular mt-1 text-xs font-medium text-muted-foreground">
                  {g === 1 ? "again this session" : `next in ${intervalLabel(schedule(current.prev, g, today).intervalDays)}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
