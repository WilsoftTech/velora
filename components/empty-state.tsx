import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Recovery action, e.g. a link or "Try again" button. */
  children?: ReactNode;
}

/** Shared by empty lists, no-result searches, and error boundaries. */
export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
      {icon && (
        <div aria-hidden className="mb-5 grid size-14 place-items-center rounded-full bg-surface-elevated text-muted">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-2 text-sm/6 text-muted">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
