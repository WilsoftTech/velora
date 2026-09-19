import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Recovery action, e.g. a link or "Try again" button. */
  children?: ReactNode;
}

/** Glass panel shared by empty lists, no-result searches, and error boundaries. */
export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="mx-auto my-8 flex max-w-md flex-col items-center rounded-lg border border-border bg-surface px-6 py-12 text-center backdrop-blur-md">
      {icon && (
        <div
          aria-hidden
          className="mb-5 grid size-14 place-items-center rounded-full border border-highlight/30 bg-accent/12 text-highlight"
        >
          {icon}
        </div>
      )}
      <h2 className="text-headline-sm">{title}</h2>
      {description && <p className="mt-2 text-body-md text-muted">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
