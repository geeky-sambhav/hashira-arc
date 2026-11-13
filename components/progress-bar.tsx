import { cn } from "@/lib/utils";

/** A slim progress bar. `value` is 0-1. */
export function ProgressBar({
  value,
  label,
  className,
  tone = "ember",
}: {
  value: number;
  label: string;
  className?: string;
  tone?: "ember" | "success";
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "ember" ? "bg-linear-to-r from-ember/70 to-ember" : "bg-success",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-foreground/[0.07]", className)} />;
}
