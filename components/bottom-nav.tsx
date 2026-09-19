import { Bookmark, Clapperboard, House, Tv } from "lucide-react";
import { NavLink } from "@/components/nav-link";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/movies", label: "Movies", icon: Clapperboard },
  { href: "/tv", label: "TV Shows", icon: Tv },
  { href: "/my-list", label: "My List", icon: Bookmark },
];

/** Phone-only tab bar; mirrors the native bottom tabs the Expo app will use. */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <NavLink
              href={href}
              className="relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted transition-colors"
              activeClassName="text-foreground before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-full before:bg-accent"
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
