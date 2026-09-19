import Link from "next/link";
import { cn } from "@/lib/utils";

interface TabLinksProps {
  label: string;
  tabs: { label: string; href: string; active: boolean }[];
}

/** URL-driven tabs: each tab is a link, so state is shareable and needs no JS. */
export function TabLinks({ label, tabs }: TabLinksProps) {
  return (
    <nav aria-label={label} className="border-b border-border">
      <ul className="flex gap-6">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              href={tab.href}
              replace
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 text-sm font-medium transition-colors",
                tab.active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
