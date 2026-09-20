# Phase 2 Audit — Accounts & Persistent Data

Scope: roadmap items 2.1–2.8, exercised against the real Supabase project. Method: the dev server and a production build driven with a real browser (Edge via `playwright-core`), `@supabase/supabase-js` clients holding real user sessions for every authorization assertion, and one administrative Postgres connection used only for setup, catalog inspection, transaction-timing control and cleanup. The test scripts live outside the repo (Playwright is a Phase 6 dependency).

Legend: **VERIFIED** = exercised against the running system. **INSPECTED** = read in code or catalog, not exercised. **NOT TESTED**. **DEFERRED** = intentionally later.

## Architecture (INSPECTED)

```text
UI (Server Components first)
  AccountLink, WatchlistButton, WatchlistView: client islands
  lib/session.ts      browser session hint; loads the SDK only when an auth cookie exists
  lib/watchlist.ts    one interface: guest → localStorage, signed in → Server Actions
Server
  proxy.ts            narrow matcher: /account, /sign-in, /sign-up (refreshes the session cookie)
  lib/auth.ts         getAuthedClient(): identity comes only from the verified session, never a payload
  app/auth/actions.ts sign in / up / out, profile update (Zod-validated)
  lib/watchlist-actions.ts  load / add / remove / import
Database (Postgres, RLS)  profiles, watchlist_items, triggers, private schema
```

Both Supabase clients use only the URL and the publishable key. `SUPABASE_SERVICE_ROLE_KEY` is not read anywhere in the code (grep-verified); no privileged name carries a `NEXT_PUBLIC_` prefix.

## Supabase configuration

| Item | Result |
| --- | --- |
| Confirm email | **VERIFIED ON** (`mailer_autoconfirm: false`, read from `/auth/v1/settings`), and re-checked after testing |
| Providers | **VERIFIED** email/password only; sign-up open; anonymous sign-ins off; no OAuth |
| Custom SMTP | **VERIFIED working**: confirmation mails were delivered for three sign-ups. (The built-in mailer's rate limit and rejected recipients blocked the first attempts.) |
| Exposed schemas | **VERIFIED** `public` and `graphql_public` only |
| Migration history | **VERIFIED, reconciled 2026-09-20.** The migrations were originally applied directly over Postgres, so the CLI history table did not exist. After re-inspecting the live database, `supabase migration repair --status applied` recorded both versions (`20260919000000`, `20260920000000`); `supabase migration list` shows local and remote in sync (see "Live re-inspection" below) |

## Database

Migrations in the repo (both applied to the live project):

1. `20260919000000_profiles_and_watchlist.sql`: tables, triggers, RLS, grants.
2. `20260920000000_watchlist_limit_lock.sql`: makes the 500-title cap race-safe (see below).

Live catalog (**VERIFIED**): `profiles` (PK `id` → `auth.users` ON DELETE CASCADE; `display_name` 1–50 chars; `avatar_url` ≤ 2048; timestamps) and `watchlist_items` (`user_id` defaults to `auth.uid()`, cascade FK; `tmdb_id > 0`; `media_type` in `movie`/`tv`; `UNIQUE (user_id, media_type, tmdb_id)` doubling as the lookup index). RLS enabled on both; five policies, all `TO authenticated` and comparing `(select auth.uid())`. Triggers: `on_auth_user_created` (profile row), `profiles_set_updated_at`, `watchlist_items_enforce_limit`. `handle_new_user` is `SECURITY DEFINER` with an empty `search_path` and no client `EXECUTE`.

Grants (**VERIFIED**): `anon` has nothing. `authenticated`: SELECT and column-level UPDATE(`display_name`) on `profiles`; SELECT, INSERT, DELETE on `watchlist_items` (no UPDATE).

### Live re-inspection and migration-history reconciliation (2026-09-20)

The live database was re-inspected from scratch rather than relying on the earlier pass: a read-only transaction of catalog `SELECT`s (61 checks, all passing), with the function bodies compared programmatically against the SQL in the repository migrations. No application data or schema was modified.

| Area | Result |
| --- | --- |
| Migration 1 schema | **VERIFIED** tables, columns and defaults, PK/FK/CHECK/UNIQUE constraints and indexes, RLS enabled on both tables, exactly the five expected policies (`PERMISSIVE`, `TO authenticated`, `(select auth.uid())` predicates), effective grants (`anon` none; `authenticated` as above; no `PUBLIC` grants), the three triggers, and the `private` schema (no client `USAGE`) holding exactly three functions |
| Function properties | **VERIFIED** `handle_new_user` is `SECURITY DEFINER` with an empty `search_path` and no `EXECUTE` for `anon`, `authenticated` or `PUBLIC`. `set_updated_at` and `enforce_watchlist_limit` are not `SECURITY DEFINER` and also have an empty `search_path` |
| Migration 2 (`enforce_watchlist_limit`) | **VERIFIED** the live body matches `20260920000000_watchlist_limit_lock.sql` (whitespace-normalised) and differs from the original version in migration 1. It takes a per-user `pg_advisory_xact_lock` (key `velora.watchlist:<user_id>`) after the existing-title early return and before the count, enforces `>= 500`, and raises `23514`. No policy or grant changes are associated with it |
| History bookkeeping | Before: `supabase_migrations.schema_migrations` did not exist and `migration list` showed both migrations as local-only. `migration repair --status applied 20260919000000 20260920000000` created the table and recorded exactly those two versions. After: `migration list` shows both as applied remotely, and a read-only query shows only those two rows. Neither migration was re-executed |

The caveat that `service_role` keeps Supabase's default full table grants is unchanged and irrelevant to client access: it bypasses RLS and its key is never used by the app.

## The 500-title cap: a race was found and fixed

| Check | Result |
| --- | --- |
| Original trigger, two overlapping transactions at 499 titles | **VERIFIED FAILURE**: both inserts passed; the user ended with **501** rows. The trigger counted without locking, so under READ COMMITTED neither transaction saw the other's uncommitted row. A 10-request HTTP race did not expose this because network latency serialised the requests |
| Fix | `pg_advisory_xact_lock` on a per-user key before counting (new migration, original file untouched) |
| Same overlap test after the fix | **VERIFIED**: the second transaction blocks, is rejected with `23514` once the first commits, and the count is exactly 500 |
| Data API, real session | **VERIFIED**: reach 499 → 500; item 501 rejected (`23514`, "Watchlist limit reached"); count unchanged; 10 parallel inserts at 499 → exactly one succeeds |
| Re-saving an existing title at 500 | **VERIFIED** harmless no-op (upsert ignoring duplicates); a plain duplicate insert is `23505`, not a limit error |
| Bulk insert of 10 at 495 | **VERIFIED** rejected as a whole, no partial rows; a bulk insert that exactly fills to 500 succeeds |
| Independence | **VERIFIED**: user B can add while user A is at 500 |
| App behaviour at the cap | **VERIFIED**: adding title 501 shows "My List is full (500 titles)…" and rolls the button back; a guest signing into a full account keeps their titles in localStorage and is told they are still on this device; no crashes |

All limit data was created with fake or test ids and removed afterwards.

## Authentication

| Behaviour | Result |
| --- | --- |
| Sign-up through the real form, Confirm email ON | **VERIFIED**: confirmation-required notice (`role=status`), no session cookie, the user is unconfirmed, and a profile row is created by the trigger with the display name from the sign-up metadata |
| Sign-in before confirming | **VERIFIED**: refused with "Confirm your email first…" and no cookie |
| Email confirmation link click | **VERIFIED** (3 real emails). Same browser (PKCE verifier present): confirms, creates a session, redirects to `/`, header shows Account. Different browser: Supabase still confirms the email, but the code exchange cannot complete, so the user lands on `/sign-in?error=callback` with "…If you already confirmed your email, just sign in below." |
| Sign-in through a Server Action | **VERIFIED**: cookies reach the browser, `AccountLink` recognises the session after navigation without a reload, and a tab that was open and signed out picks it up on window focus (the fallback) |
| Persistence | **VERIFIED**: survives full reload and client navigation |
| Invalid credentials | **VERIFIED**: "Incorrect email or password."; email echoed, password cleared, no cookie |
| Validation | **VERIFIED**: server-side Zod errors for empty or bad fields, announced with `aria-invalid` + `aria-describedby`; browser-native `required`/`minLength` also active |
| `/account` signed out | **VERIFIED**: redirects to `/sign-in?next=/account` |
| `/sign-in`, `/sign-up` signed in | **VERIFIED**: redirect to `/` |
| Sign-out | **VERIFIED**: header returns to the signed-out state; guest list is empty afterwards (account items are never left in localStorage) |
| Open redirects | **VERIFIED**: `//evil.com`, `https://evil.com`, `/\evil.com` fall back to `/`; the callback with a bad or missing code stays on the app origin |
| Session token | **VERIFIED**: `role: authenticated`, no `service_role` claim. Cookies are `sb-<ref>-auth-token.0/.1` |
| Session expiry / refresh-token rotation | NOT TESTED (relies on `@supabase/ssr` + `proxy.ts`) |
| Sign-out on other devices, "leaked password" protection | NOT TESTED |

## Profiles

**VERIFIED** through the UI and Data API: created automatically on sign-up; account form pre-fills from the database; saving trims the value; a 51-character name is rejected by the server with a field error; clearing the name stores `NULL`; `updated_at` advances. Users cannot write `id`, `created_at`, `updated_at` or `avatar_url`, insert, or delete profiles (all `42501`).

## Watchlist

- **Guest (VERIFIED, production build):** add, remove, reload persistence, cross-tab sync, no false-empty flash.
- **Signed in (VERIFIED through the UI, server rows cross-checked by an independent session):** add movie and TV, remove from My List, nothing written to localStorage, state survives reload and sign-out/sign-in, duplicate saves are no-ops, and the same tmdb id as a different media type is a separate title.
- **Guest → account merge (VERIFIED):** A: empty guest list makes no import call. B: local items land on the server, then the local copy is cleared. C: merge, not replace. D: a title present locally and remotely is stored once. E: a second migration run (storage event) changes nothing. F: with the server call blocked, the local list survives, the user is told, and "Try again" migrates it.

## Row Level Security, two users (VERIFIED, 48 assertions, real sessions, Data API only)

Each user: reads only their own profile and watchlist; updating another user's profile affects 0 rows (RLS filters it, and the target's data is unchanged); inserting a row with another `user_id` is refused (`42501`); deleting another user's row affects 0 rows; no UPDATE on watchlist rows at all (`42501`); protected profile columns, profile insert and profile delete all refused (`42501`). Constraints: duplicate `23505`; `media_type = 'person'`, `tmdb_id` 0, negative, or 2³¹ all rejected. Anonymous: every operation on both tables `42501`. `private` schema and its functions: not exposed to anon or authenticated (`404`/`406` `PGRST106`).

## Security review

| Check | Result |
| --- | --- |
| Service-role key in browser code | **VERIFIED** absent: 0 secret values in 21 shipped client files or in four rendered pages (checked: service-role key, database URLs, TMDB credentials) |
| Client-supplied user ids | **INSPECTED** never trusted: identity comes from `getClaims()`; inserts rely on the `auth.uid()` column default |
| Input validation | **INSPECTED + VERIFIED**: Zod on every action (`mediaRefSchema`, 500-item list cap, auth and profile schemas); DB constraints back it up |
| Error leakage | **INSPECTED**: Auth failures map to fixed messages, and details go to the server log |
| Enumeration | **INSPECTED**: sign-up shows the same notice whether or not the address exists |
| Cookies | Not `HttpOnly` (the browser client must read them, by design of `@supabase/ssr`); `Secure` is absent on `http://localhost` only |

## Responsive and accessibility

- **VERIFIED, production build:** `/sign-in`, `/sign-up`, `/account`, `/my-list` at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, plus an 8px-step sweep from 320 to 1440 on `/`, `/movies`, `/sign-in`, `/sign-up`, `/my-list`, `/account`: no horizontal overflow. One `<h1>` each.
- **axe-core** (WCAG 2 A/AA, 2.1 AA, best-practice, at 320 and 1440px): no violations on those four pages.
- **Keyboard (VERIFIED):** tab order is field → field → submit on both forms, every control shows a focus indicator, and Enter submits from a field.
- INSPECTED only: mobile keyboard hints (`inputMode`, `autocomplete`), `motion-reduce` on the spinners. NOT TESTED: a real screen reader, real devices.

## Client JavaScript (VERIFIED, production build, gzip)

| Visitor | `/` | Notes |
| --- | --- | --- |
| Guest | 146.3 KB | 0 Supabase chunks on 10 routes. Phase 2 added 0.1 KB (146.2 → 146.3) |
| Signed in | 212.1 KB | +65.8 KB: the lazily imported SDK chunk, loaded only when an auth cookie exists |

`/` is still static (revalidate 1h); `proxy.ts` still matches only `/account`, `/sign-in`, `/sign-up`.

## Phase 1 regression (VERIFIED, production build)

`/`, `/movies`, `/tv`, `/trending`, `/search`, `/my-list`, `/movie/[id]`, `/tv/[id]`: 200, one `h1`, no overflow, no console problems. Detail page still has Trailer, Cast and More like this. Guest My List: add, persist, reload, cross-tab, no false-empty flash.

## Bugs found and fixed

| # | Finding | Fix (files) |
| --- | --- | --- |
| 1 | **500-title cap race**: two concurrent inserts at 499 both succeeded (501 rows) | New migration with a per-user advisory lock (`supabase/migrations/20260920000000_watchlist_limit_lock.sql`) |
| 2 | **Header overflow, 124px at 768px and 92px at 800px, every page**: the full "Sign in / Create account" pair appeared at `md`. At 1024px it wrapped and squeezed the logo to 29px | Compact account icon until `xl`; header search stays narrower until `xl` (`components/account-link.tsx`, `components/header-search.tsx`). Logo is full-size and labels no longer wrap from 1024px up. **Only partly resolved:** the overflow is gone at 768px, but the logo is still squeezed to 7px there and two nav labels wrap up to 960px (Known limitation 2) |
| 3 | **Stale alert**: clicking "Add to My List" before the list loaded showed "Still loading your list" and it stayed on screen after the list arrived | `publish()` clears a "loading" error once items arrive (`lib/watchlist.ts`) |

## Known limitations and technical debt

1. **Migration history: reconciled (2026-09-20).** Both Phase 2 migrations are now recorded as applied. Two follow-ups remain. Migrations applied later through the dashboard SQL editor are not recorded automatically, so each needs `supabase migration repair` (or should be applied through the CLI). And `DIRECT_URL` (`db.<ref>.supabase.co`) resolves to IPv6 only and is unreachable from an IPv4-only network, so CLI runs from such a machine need the session-pooler URL instead.
2. **Header, 768–960px:** the desktop header was already over-constrained in the Phase 1 layout (with the account control removed, the logo shrinks to 43px at 768 and two nav labels wrap up to 900px). The account icon adds ~36–44px of pressure, so the logo is 7px at 768 and labels wrap up to 960px. Recommended fix: show the desktop nav and search from `lg` and keep the bottom nav until then. Not done: it changes Phase 1 layout.
3. **Whole-list failure.** `readList` resolves every saved title against TMDB, and any non-404 failure fails the whole signed-in list. On the detail page the add button then says "Still loading your list" (no retry there; retry exists on My List). INSPECTED, not reproduced.
4. **Dead TMDB ids** still count toward the 500 cap but are dropped from the list, so they cannot be removed in the UI (93 of 500 ids in the test set).
5. **A full 500-title list takes 10–18s to resolve** (500 TMDB lookups in batches of 20). Fine for typical lists; revisit with caching or paging.
6. **Cross-browser confirmation** confirms the email but lands on a generic "link couldn't be used" message; wording could say the email is confirmed.
7. Not `HttpOnly` session cookies (see above); rate limiting of auth endpoints is Supabase's default (Phase 6).
8. **A non-test account appeared in the project during testing** (not created by these tests). It was left untouched and only counted.

## Deferred

Playwright/Vitest automation of these flows (Phase 6); Sentry; auth rate-limit review; account deletion and data-export flows (Phase 7); avatar upload (needs a URL allow-list first); password reset and email change (not in Phase 2 scope).

## Release gate (final tree)

`npm run lint`: pass. `npm run typecheck`: pass. `npm run build`: pass. A fresh-clone `npm ci` run was not performed in this pass (**NOT TESTED**). Test data: all three temporary users were deleted; their profiles, watchlist rows, identities and sessions were removed by cascade; no bulk rows remain.
