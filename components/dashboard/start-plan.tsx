"use client";

import { useTransition } from "react";
import { PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { startPlan } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";

export function StartPlanButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          const result = await startPlan(timeZone);
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      <PlayIcon />
      {pending ? "Starting…" : "Start week 1 today"}
    </Button>
  );
}
