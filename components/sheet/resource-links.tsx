import { ArrowUpRightIcon } from "lucide-react";
import type { ResourceLink } from "@/content/types";
import { cn } from "@/lib/utils";

/** "Learn from" chips. Opens in a new tab so the sheet stays where it is. */
export function ResourceLinks({ links, className }: { links: readonly ResourceLink[]; className?: string }) {
  if (links.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {links.map((l) => (
        <li key={l.url}>
          <a
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground/80 outline-none hover:border-primary/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {l.label}
            {l.paid && <span className="text-[10px] font-normal text-muted-foreground">paid</span>}
            <ArrowUpRightIcon
              className="size-3 text-muted-foreground transition-transform group-hover:translate-x-px group-hover:-translate-y-px"
              aria-hidden="true"
            />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
