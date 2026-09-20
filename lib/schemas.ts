import * as z from "zod";

/**
 * Runtime validation for everything that arrives from a browser. Kept free of
 * Next.js imports so the same schemas can be reused by a future Expo client.
 */

const email = z.string().trim().max(254, "That email address is too long.").pipe(z.email("Enter a valid email address."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72, "Use 72 characters or fewer."),
});

const displayName = z.string().trim().max(50, "Keep your name to 50 characters or fewer.");

export const profileSchema = z.object({ displayName });

export const signUpSchema = z.object({
  displayName,
  email,
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
});

/** Per-user cap on saved titles. Enforced by a database trigger; this mirrors it for the import payload. */
export const MAX_WATCHLIST_ITEMS = 500;

export const mediaRefSchema = z.object({
  id: z.number().int().positive().max(2_147_483_647),
  mediaType: z.enum(["movie", "tv"]),
});

export const mediaRefListSchema = z.array(mediaRefSchema).max(MAX_WATCHLIST_ITEMS);

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors;
}
