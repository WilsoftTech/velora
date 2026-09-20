import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  errors?: string[];
  hint?: string;
  children: (props: { id: string; className: string; "aria-invalid": true | undefined; "aria-describedby": string | undefined }) => ReactNode;
}

/** Label + input + error/hint wiring (ids, aria-invalid, aria-describedby) shared by every form. */
export function Field({ id, label, errors, hint, children }: FieldProps) {
  const describedBy = [errors?.length ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-label-lg">
        {label}
      </label>
      {children({
        id,
        className: cn(
          "h-11 w-full rounded-default border bg-canvas-subtle/80 px-4 text-body-md text-foreground placeholder:text-muted/80 transition-[border-color,box-shadow] focus:border-highlight focus:shadow-focus",
          errors?.length ? "border-destructive" : "border-border",
        ),
        "aria-invalid": errors?.length ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-body-sm text-muted">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-error`} className="mt-1.5 text-body-sm text-destructive">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
