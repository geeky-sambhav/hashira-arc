import Link from "next/link";
import { Suspense } from "react";
import { DesktopNav, MobileNav } from "./nav-links";
import { ThemeToggle } from "./theme";

/** Three rising pillars. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <rect x="3" y="11" width="4.5" height="10" rx="1.2" opacity="0.45" />
      <rect x="9.75" y="7" width="4.5" height="14" rx="1.2" opacity="0.7" />
      <rect x="16.5" y="3" width="4.5" height="18" rx="1.2" />
    </svg>
  );
}

export function AppHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md font-heading text-[15px] font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo className="size-5 text-primary" />
            Hashira Arc
          </Link>
          {/* usePathname is request data for dynamic routes, so the nav streams in. */}
          <Suspense fallback={<DesktopNav pathname="" />}>
            <DesktopNav />
          </Suspense>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <Suspense fallback={<MobileNav pathname="" />}>
        <MobileNav />
      </Suspense>
    </>
  );
}
