import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80",
  secondary:
    "border border-border bg-surface-elevated/70 text-foreground hover:bg-surface-elevated active:bg-border/60",
  ghost: "text-muted hover:text-foreground active:text-foreground",
};

/** Class names shared by `<Link>` and `<button>` so both look identical. */
export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}
