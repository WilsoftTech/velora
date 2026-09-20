"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { updateProfile, type AuthFormState } from "@/app/auth/actions";
import { buttonClass } from "@/components/button";
import { Field } from "@/components/form-field";

const initialState: AuthFormState = {};

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message && (
        <p role="alert" className="rounded-default border border-destructive/40 px-4 py-3 text-body-md text-destructive">
          {state.message}
        </p>
      )}
      {state.notice && (
        <p role="status" className="rounded-default border border-highlight/30 bg-accent/12 px-4 py-3 text-body-md">
          {state.notice}
        </p>
      )}
      <Field id="displayName" label="Display name" errors={state.errors?.displayName}>
        {(props) => (
          <input {...props} name="displayName" type="text" autoComplete="nickname" maxLength={50} defaultValue={state.values?.displayName ?? displayName} />
        )}
      </Field>
      <button type="submit" disabled={pending} aria-disabled={pending} className={buttonClass("secondary")}>
        {pending && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
