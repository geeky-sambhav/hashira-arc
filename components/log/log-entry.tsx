"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteTimeLog } from "@/lib/actions/time-log";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function LogEntry({
  id,
  dayLabel,
  minutes,
  title,
  href,
  note,
}: {
  id: string;
  dayLabel: string;
  minutes: number;
  title: string;
  href: string;
  note: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteTimeLog(id);
      if (!result.ok) toast.error(result.error);
    });
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <li className={cn("flex items-center gap-3 px-4 py-3 transition-opacity", pending && "opacity-40")}>
      <span className="tabular w-14 shrink-0 text-sm text-muted-foreground">{dayLabel}</span>
      <span className="tabular w-16 shrink-0 text-sm font-medium">
        {hours > 0 && `${hours}h `}
        {mins > 0 && `${mins}m`}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="block truncate rounded-md text-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {title}
        </Link>
        {note && <p className="truncate text-xs text-muted-foreground">{note}</p>}
      </div>
      {confirming ? (
        <span className="flex shrink-0 items-center gap-1">
          <Button variant="destructive" size="xs" onClick={remove} disabled={pending}>
            Delete
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </span>
      ) : (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Delete the ${dayLabel} entry for ${title}`}
          onClick={() => setConfirming(true)}
          className="shrink-0 text-muted-foreground opacity-60 hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2Icon />
        </Button>
      )}
    </li>
  );
}
