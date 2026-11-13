"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainIcon, ClockIcon, LayoutDashboardIcon, MapIcon, SettingsIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Today", icon: LayoutDashboardIcon },
  { href: "/roadmap", label: "Roadmap", icon: MapIcon },
  { href: "/review", label: "Review", icon: BrainIcon },
  { href: "/log", label: "Hours", icon: ClockIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Desktop: inline links in the header. */
export function DesktopNav({ pathname: fixed }: { pathname?: string }) {
  const live = usePathname();
  const pathname = fixed ?? live;
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {LINKS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "bg-foreground/[0.07] text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile: a fixed tab bar at the bottom, in thumb reach. */
export function MobileNav({ pathname: fixed }: { pathname?: string }) {
  const live = usePathname();
  const pathname = fixed ?? live;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:text-foreground",
                  active && "text-primary",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
