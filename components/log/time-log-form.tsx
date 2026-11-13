"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logTime } from "@/lib/actions/time-log";
import { addDays } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PhaseOption {
  id: string;
  label: string;
  title: string;
  items: { id: string; title: string }[];
}

const PRESETS = [25, 50, 90, 120];

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

/**
 * Log study time. With `fixedItemId` it becomes a compact one-row form for an
 * item page; otherwise it shows phase and item pickers.
 */
export function TimeLogForm({
  today,
  phases,
  defaultPhaseId,
  fixedItemId,
}: {
  today: string;
  phases?: PhaseOption[];
  defaultPhaseId?: string;
  fixedItemId?: string;
}) {
  const [minutes, setMinutes] = useState("50");
  const [day, setDay] = useState(today);
  const [phaseId, setPhaseId] = useState(defaultPhaseId ?? phases?.[0]?.id ?? "");
  const [itemId, setItemId] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const compact = Boolean(fixedItemId);
  const phase = phases?.find((p) => p.id === phaseId);
  const value = Number(minutes);
  const valid = Number.isFinite(value) && value >= 1 && value <= 1440;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    startTransition(async () => {
      const result = await logTime({
        loggedOn: day,
        minutes: value,
        phaseId: fixedItemId ? null : phaseId,
        itemId: fixedItemId ?? (itemId || null),
        note,
      });
      if (result.ok) {
        toast.success(`Logged ${value} minutes`);
        setNote("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-minutes">Minutes</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="log-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            required
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="tabular w-24"
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick amounts">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMinutes(String(p))}
                aria-pressed={value === p}
                className={cn(
                  "tabular rounded-full border px-3 py-1 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  value === p && "border-primary bg-primary/10 text-primary hover:text-primary",
                )}
              >
                {p >= 60 ? `${p / 60}h` : `${p}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-day">Date</Label>
          <Input
            id="log-day"
            type="date"
            required
            max={addDays(today, 1)}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="tabular"
          />
        </div>
        {!compact && phases && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-phase">Phase</Label>
            <select
              id="log-phase"
              value={phaseId}
              onChange={(e) => {
                setPhaseId(e.target.value);
                setItemId("");
              }}
              className={selectClass}
            >
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}: {p.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!compact && phase && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-item">Item (optional)</Label>
          <select id="log-item" value={itemId} onChange={(e) => setItemId(e.target.value)} className={selectClass}>
            <option value="">The phase in general</option>
            {phase.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {!compact && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="log-note">Note (optional)</Label>
          <Input
            id="log-note"
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you get done?"
          />
        </div>
      )}

      <Button type="submit" disabled={pending || !valid} className="w-full sm:w-fit">
        {pending ? "Logging…" : "Log time"}
      </Button>
    </form>
  );
}
