import Link from "next/link";
import { ThemeToggle } from "./theme";

/** A single flame. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="logo-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--ember)" }} />
          <stop offset="1" style={{ stopColor: "var(--sun)" }} />
        </linearGradient>
      </defs>
      <path
        fill="url(#logo-flame)"
        d="M12.4 1.5c.5 3.6 5.6 6 5.6 11.7a6 6 0 0 1-12 0c0-2.3.9-3.9 2.1-5.2.1 1.9.9 3.1 2 3.5-.6-3.8.3-7.3 2.3-10z"
      />
      <path
        fill="var(--background)"
        opacity="0.55"
        d="M12 12.5c.2 1.6 2.4 2.5 2.4 4.8a2.4 2.4 0 0 1-4.8 0c0-1.8 1.6-2.7 2.4-4.8z"
      />
    </svg>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md font-heading text-lg font-extrabold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo className="size-6" />
          Hashira Arc
          <span aria-hidden="true" className="hidden text-sm font-semibold text-muted-foreground sm:inline">
            柱
          </span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
      {/* The haori check, as a hairline under the header. */}
      <div aria-hidden="true" className="ichimatsu h-1.5 w-full" style={{ backgroundSize: "6px 6px" }} />
    </header>
  );
}
