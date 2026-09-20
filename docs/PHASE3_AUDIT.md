# Phase 3 Audit — Discovery Intelligence

Running record, one section per checkpoint. Only Checkpoint 1 (Discover and genre filters) is implemented so far.

Legend: **VERIFIED** = exercised against the running system. **INSPECTED** = read in code, docs or catalog, not exercised. **NOT TESTED**. **DEFERRED** = intentionally later.

Method for Checkpoint 1: a production build (`next build` + `next start`) driven with a real browser (Edge via `playwright-core`), plus axe-core. The scripts live outside the repo, as in Phase 2 (Playwright is a Phase 6 dependency). Discover results were compared against an independently hand-built TMDB query for every filter scenario, not against the app's own parameter code. No database, service-role key, throwaway user or migration was used or created.

---

## Architecture investigation: does recent-search personalization need a page-level session read on `/search`?

**Question (from the Phase 3 approval):** can authenticated recent searches be isolated without making the whole `/search` route auth-aware, and without weakening authentication?

**Findings**

| Finding | Evidence |
| --- | --- |
| `/search` is **already fully dynamic**: it awaits `searchParams`. Reading the session would not cost it any static or cached rendering. The same is true of `/movies`, `/tv`, `/trending`, `/discover` and, notably, `/[mediaType]/[id]`. Only `/` is static (revalidate 1h). | **VERIFIED**: `next build` route table shows `ƒ` for all of them |
| What a server-side session read on `/search` would actually cost is different: (1) `proxy.ts` matches only `/account`, `/sign-in`, `/sign-up`, so a Server Component read there cannot refresh an expired token; (2) Server Components cannot write cookies (`lib/supabase/server.ts` catches and logs that), so a refresh performed during render would rotate the refresh token without the browser receiving the new cookies; (3) it puts per-user HTML behind a route that is otherwise identical for everyone. | **INSPECTED**: `proxy.ts`, `lib/supabase/server.ts`, Next docs (`cookies`, authentication guide) |
| Server Actions **can** write cookies, so a session read there refreshes correctly. This is the mechanism My List already uses (`WatchlistView` + `lib/watchlist-actions.ts`), and `AccountLink` documents the same reasoning for the header. | **INSPECTED** |
| The project signs tokens with **ES256** (public JWKS endpoint answers 200 with an `ES256` key), so `getClaims()` verifies locally with no network call. Adding routes to the proxy matcher would therefore be cheap. | **VERIFIED** (JWKS endpoint; no credentials involved) |
| Actual behaviour of an expired access token on a Server Component read | **NOT TESTED**: needs throwaway users, which are not authorized at this checkpoint |

**Decision for Checkpoint 3 (recorded, not yet implemented):** render recent searches in a small client island that calls a Server Action, gated on `useSession() === "signed-in"`, following the `WatchlistView` pattern.

* `/search` keeps **no** session read at page level and needs **no** `proxy.ts` change.
* Guests pay nothing: no request, no Supabase SDK (the SDK already loads only when an auth cookie exists).
* Authentication stays correct because the identity check and any token refresh happen inside the Server Action, where cookies are writable.
* Cost: a short placeholder before the list appears, and a little client code for remove/clear.

**For `/discover` (Checkpoints 5 and 6):** session-aware rendering is acceptable. If Recently viewed / Recommended are server-rendered, `/discover` must be added to the `proxy.ts` matcher so an expired token is refreshed before render. The alternative is the same island-plus-action pattern. Decide at Checkpoint 5, keeping the public results (Checkpoint 1) session-free either way. As implemented now, `/discover` reads no session.

**Correction to the architecture report:** it said the detail page's lack of cookie reads "keeps it cacheable". The page is already dynamic (`ƒ`); its TMDB data is cached by the fetch cache, not the route. The reasons to record views through a client island and Server Action (no cookie writes during render, no per-user HTML on a shared route) are unchanged.

---

## Checkpoint 1 — Discover and genre filters

### Implemented

`/discover`: a server-rendered page with URL-driven state, a media-type tab (existing `TabLinks`), a native-control filter form, the existing `MovieGrid`/`MovieCard`, and pagination extracted from Browse.

### URL contract (as implemented)

`/discover?type=tv&genre=10765&year=2019&rating=7&sort=rating&page=2`

| Param | Accepted | Default (omitted from canonical URL) |
| --- | --- | --- |
| `type` | `movie` \| `tv` | `movie` |
| `genre` | one TMDB id **valid for the chosen `type`** (19 movie ids, 16 TV ids) | none |
| `year` | integer 1900 to next calendar year | none |
| `rating` | 5, 6, 7 or 8 (minimum TMDB average) | none |
| `sort` | `popular` \| `rating` \| `newest` | `popular` |
| `page` | 1 to 500 (same clamp as Browse) | 1 |

Deviation from the architecture report: `rating` accepts 5–8, not 1–9, so the URL contract and the select options are the same set (an accepted value with no matching option would show "Any" while filtering). 9+ leaves almost nothing worth browsing.

Parsing (`lib/discover.ts`, Zod, no framework imports) **never throws**. Invalid, out-of-range, decimal, negative, repeated or unknown values fall back to the default; a genre from the other media type is dropped. Canonicalisation is by `discoverHref()`: fixed parameter order, defaults omitted. Apply runs as a Server Action that parses the submitted form with the same parser and redirects to the canonical URL, so the URL never carries empty fields. Garbage in a hand-typed URL is rendered as its fallback and points its `<link rel="canonical">` at the canonical address rather than redirecting.

Switching media type keeps year, rating and sort and drops the genre.

### TMDB access (`discoverMedia` in `lib/tmdb/media.ts`)

`GET /discover/{movie|tv}` with, always: `include_adult=false`, `page`, `sort_by`. Built only from a validated `DiscoverFilters`; nothing arbitrary is forwarded. Cached like every other TMDB call (1h revalidate).

| Filter | Movie | TV |
| --- | --- | --- |
| genre | `with_genres` | `with_genres` |
| year | `primary_release_year` | `first_air_date_year` |
| min rating | `vote_average.gte` + `vote_count.gte=50` | same |
| sort popular | `popularity.desc` | same |
| sort rating | `vote_average.desc` + `vote_count.gte=300` | `…=100` |
| sort newest | `primary_release_date.desc` + `primary_release_date.lte=<today>` + `vote_count.gte=10` | `first_air_date.desc` + `first_air_date.lte=<today>` + `vote_count.gte=5` |

Vote floors were chosen against live TMDB, not guessed. With a floor of 100 votes, "top rated" movies was led by a 9.9 title with 143 votes; at 300 it is led by broadly rated titles. With no floor, "newest" was entirely zero-vote placeholders released the same day; with 10 (movies) or 5 (TV) it is real, recent releases. The `lte=<today>` guard means a title with a future placeholder date is never ranked as "new". The sample-catalogue fallback (`sampleDiscover`) applies the same filters when no TMDB credentials are set.

### Genre verification — **VERIFIED**

Fetched `/genre/movie/list` and `/genre/tv/list` from live TMDB on 2026-09-20 and compared with the static lists: **movie 19/19 ids, TV 16/16 ids match**. Extended the existing `GENRE_NAMES` map instead of creating a second one; added the five ids it lacked (10763 News, 10764 Reality, 10766 Soap, 10767 Talk, 10770 TV Movie). Side effect (intended): cards for titles in those genres now show a genre they previously omitted. TMDB confirmed that a movie-only genre id on `/discover/tv` returns 0 results, which is why the parser checks membership per type.

### Navigation

| Width | Behaviour | Evidence |
| --- | --- | --- |
| < 768 (bottom tabs) | **Discover is a 5th tab.** Cells are 64px at 320px; the widest label ("TV Shows") is 60.4px, the smallest gap between adjacent label texts is 5.8px at 320 (13.8px at 360, ≥16.8px from 375). Nothing clips or overlaps; touch cells are 64×56. Snug at 320, comfortable from 360. | **VERIFIED** (measured at 320/360/375/390/430) |
| 768–1279 (header) | **Unchanged.** Header geometry compared to a baseline captured before any edit: identical at 768, 800, 900, 960, 1024, 1100, 1279. Discover is reachable from the "Filter by genre" link on Movies and TV and the "Browse by genre" link on Search. | **VERIFIED** |
| ≥ 1280 (header) | **Not added.** See below. Same links as above. | **VERIFIED** |

**Why no header item at xl (measurement did not support it).** I added it and measured. The page container is capped at 1200px of content, so there is no extra room above 1280. At 1280 and 1440 the logo shrank from 165px to 154.5px (a 10.5px squeeze), which means the baseline had about 78px of slack against the ~89px Discover needs. The header search also grows by 32px on focus, so a clean fit needs about 43px trimmed elsewhere in the Phase 1/2 header. I reverted the change rather than start a header rework. Options for a later decision: (a) trim xl spacing (`gap-8`→`gap-6` saves 16px, nav `px-3`→`px-2.5` about 24px, search `w-72`→`w-64` 24px); (b) an icon-only compass link (about 44px, fits the slack including focus growth); (c) leave as is.

### Behaviour tests — **VERIFIED** (production build, real TMDB unless noted)

`discover-flow`: **77 passed, 0 failed.**

* Default state, then movie genre, TV genre, year, rating, sort (rating, newest), and a combined filter set, each driven through the real form; the rendered card ids equal an independent TMDB query for the same filters.
* Canonical URLs after Apply (fixed order, no empty params); type switch keeps year/rating/sort and drops the genre; Reset keeps only the type; Apply from page 2 resets to page 1.
* Pagination: page 2 results match TMDB page 2; Previous returns to the canonical page-1 URL.
* Refresh keeps state; back and forward restore URL, form values and results.
* 21 malformed-parameter cases (bad/decimal/oversized/incompatible genre, bad year and rating, bad sort and page, page 999999 clamps to 500, repeated params, unknown params, control/SQL characters): all 200, all fall back or clamp correctly, canonical link correct, and a fully malformed URL still renders 20 results with default form values.
* Empty result set and past-the-last-page states, each with its recovery link.
* Unhydrated form: with the client script chunks blocked, Apply still navigates to the canonical URL and results render (the Server Action form works before hydration).
* Metadata: default page is indexable with canonical `/discover`; filtered and paginated pages carry `noindex, follow` and a canonical to their own canonical URL.

`discover-modes`: **16 passed.** A server with an invalid TMDB token shows the in-page error state (no internals leaked, filters stay usable, Try again does not crash, Apply still navigates). A server with no credentials serves the sample catalogue through every filter.

### Accessibility — **VERIFIED**

* axe-core (WCAG 2.0/2.1 A and AA plus best-practice) at 320px and 1440px on: default, filtered TV, page 2, empty results, out-of-range page, error state, `/movies` and `/search` (both gained a link): **0 violations in all 16 scans.**
* Keyboard: tab order is Movies → TV Shows → Genre → Year → Minimum rating → Sort → Apply → Reset; every stop shows a focus indicator; Enter in the year field submits; an out-of-range year is stopped by native validation before any request.
* Structure: one `h1`; the form, media-type tabs, results section and pagination are named landmarks; every control has a programmatic label. Controls are native `<select>`/`<input>`, so there is no custom dropdown to get wrong.
* INSPECTED only: real screen reader and mobile-keyboard behaviour. NOT TESTED on real devices.

### Responsive — **VERIFIED**

`/discover` in three states (default, fully filtered TV, empty results) at 320, 360, 375, 390, 430, 768, 1024, 1280 and 1440: no horizontal overflow, one `h1`, every control and button at least 44px tall, and no clipped select text. This pass found and fixed two defects: "Any rating" was clipped in the half-width cell at 320px (now "Any"), and long genre names ("Sci-Fi & Fantasy") were clipped in a quarter-width cell at 768px (Genre and Sort now get double width from `md`, four equal columns from `lg`).

### Regression — **VERIFIED**

42 of 42 checks. `/`, `/movies`, `/tv`, `/trending`, `/search` (empty, query, scope), `/discover`, a movie detail, a TV detail, `/my-list` and `/sign-in` at 390px and 1280px: 200, one `h1`, no overflow, no console errors or warnings. The pagination markup on `/movies?page=2`, `/tv?page=2&list=top_rated` and `/trending?page=3` is **byte-identical** to a capture taken before the extraction. Guest My List end to end (add a movie and a TV show, both tabs, survives reload, remove to empty state). Guest client JS: `/` is **146.3 KB gzip, identical to the Phase 2 audit**; `/discover` about 146.6 KB; the Supabase SDK is not loaded for guests on any of `/`, `/discover`, `/movies`, `/search`.

Signed-in flows (authenticated My List, sign-in/out, account, guest-to-account merge) are **NOT TESTED** in this checkpoint: creating a test user was not authorized, and no file in those flows was touched. `/account` signed-out still redirects to `/sign-in?next=/account`.

### Observations and technical debt

1. **Head metadata is not refreshed on client-side transitions that change only the query string.** Hard loads and crawler fetches carry the correct `robots` and `canonical` (verified), but after an in-app filter change the browser's live `<head>` keeps the first page's values. Not investigated further; it has no effect on crawlers, and the title is the same on every state. Worth a look if titles ever become filter-specific.
2. **With JavaScript fully disabled, every page (not only Discover) shows only its loading skeleton.** The root `app/loading.tsx` streams page content behind a fallback that an inline script reveals. This predates Phase 3 and was confirmed on `/movies`. "Works without client JavaScript" is therefore verified as "works before hydration" (script chunks blocked), not with scripting off. A real fix means rethinking the root loading boundary, which is Phase 1 territory.
3. **768–960px header compression** (logo about 7px at 768) is unchanged and remains the Phase 2 debt item. Discover deliberately stays out of that header.
4. `TabLinks` navigates with `replace`, so switching Movies/TV does not add a history entry, while Apply does. INSPECTED; back/forward across Apply is verified, across tab switches is not.
5. TMDB's rating data is noisy even with vote floors (small-audience titles can still rank high); the floors are tuned for tolerable results, not perfect ones.
6. Adding the five missing genre names changes card genre chips for a handful of titles (intended, but a visible side effect).

### Quality gates (final tree)

`npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`: see the Checkpoint 1 report.

---

## Checkpoint 2 — Search analytics: database architecture and migration

**Status: migration APPLIED to the live project (night of 2026-09-20 to 2026-09-21, local time) and structurally/security-verified live (see "Applied and verified live").** Behaviour with real sessions, data and concurrency was then verified live too (see "Behavioural and adversarial verification (live)"). `DIRECT_URL` was never used; the service-role key was used only to create and delete two disposable test users during that verification.

Extra legend for this section: **LOCAL** = exercised on a throwaway local Postgres (PGlite, no Supabase, no credentials). Evidence about the SQL, never a substitute for live verification.

Migration: `supabase/migrations/20260920181819_search_analytics_and_history.sql`. Phase 1/2 migrations are untouched.

### Repository state (resolved)

Checkpoint 2 began in a checkout whose `main` (`dd35d7f`) was two commits **behind** `origin/main`, so Checkpoint 1 looked missing. It is not: it is commit `c5a9bbc` on `origin/phase3-discover`, on top of `origin/main` (`313e621`), which is on top of `dd35d7f`. The three histories are linear, nothing diverged, and nothing was lost or stashed. An earlier draft of this section, written against the stale checkout, created a second `docs/PHASE3_AUDIT.md`; this file replaces it and is the remote file plus this appended section. `313e621` also reconciled the Supabase CLI migration history for the two Phase 2 migrations (see "Applying").

### Approved decisions

`scope` in the history key `(user_id, scope, query)`; anonymous events with no identity; client island → Route Handler → `record_search`; no extra TMDB request to check `result_count`, which stays bounded and untrusted; a per-user advisory lock and an exact 20-row history bound; 7-day trending with a minimum of 3 events and an aggregate-only public RPC; a private event table with no client privileges; physical retention scheduling deferred; no new dependencies.

### Design (INSPECTED)

| Object | Purpose |
| --- | --- |
| `private.search_events` | Anonymous event log: canonical `query`, `scope`, untrusted `result_count`, `created_at`. No identity |
| `public.search_history` | A signed-in user's 20 most recent searches; PK `(user_id, scope, query)`; `searched_at` |
| `public.record_search(p_query, p_scope, p_result_count)` | The only writer of both tables. `SECURITY DEFINER`, returns `void` |
| `public.trending_searches(p_limit)` | Aggregate-only read of the last 7 days. `SECURITY DEFINER` |
| `private.normalize_search_query(text)` | The single normalization contract. Not callable by clients |
| `private.purge_search_events(interval, integer)` | Bounded maintenance purge. Not callable by clients, **not scheduled** |

**Events stay in `private`.** Migrations, RLS, indexes and the aggregate all work there; the two RPCs must live in `public` (PostgREST only calls exposed schemas) and reach `private` through `SECURITY DEFINER`. The Phase 2 live re-inspection verified that `private` has no client `USAGE` and that the exposed schemas are `public` and `graphql_public` only. That is not relied on alone: the table also has RLS on with no policy, and every privilege on it and on its identity sequence is revoked.

**Deleting history needs no privileged function.** `authenticated` has `SELECT` and `DELETE` on `search_history` under own-row policies, which covers "remove one" and "clear all" (supabase-js needs a filter on a delete, e.g. `.not("query", "is", null)`). No INSERT/UPDATE grant or policy exists.

### Normalization contract

Canonical form = `private.normalize_search_query(raw)` or `NULL` (not recorded). Steps: reject raw input over 500 characters; NFKC; delete invisible and control characters (C0/C1 except whitespace controls, soft hyphen, Arabic letter mark, ZWSP, LRM/RLM, bidi controls, BOM); every whitespace run to one space, trimmed; `lower()`; 2 to 100 code points; at least one "useful" character. ZWNJ and ZWJ are **kept** (Persian, Indic scripts, emoji sequences).

"Useful" is a blocklist (space, ASCII punctuation, Latin-1 symbols, combining marks, general punctuation, currency, arrows/maths/technical/dingbats, CJK punctuation, variation selectors, emoji, and invisible or meaningless code points: Hangul and Khmer fillers, other default-ignorable code points, private use, non-characters). It is not `[[:alnum:]]`, because that follows the database's ctype locale and can silently reject every non-ASCII title under a C locale. The gate is hygiene, not security (anyone can pass it with letters). Known limits, accepted: lone combining marks, script-specific punctuation and unassigned code points still pass.

**How the database and the application agree:** they do not both implement it. The application sends the query it searched (`normalizeSearchQuery`: trimmed, at most 100 code points) and validates only type, scope and count range with Zod; the database alone canonicalizes. The display query is never lowercased in the app, because that would rewrite the search box while the user types.

**How NFKC is implemented.** `normalize(text, NFKC)` is a core `pg_catalog` function (internal C `unicode_normalize_func`), available since PostgreSQL 13. It uses PostgreSQL's own Unicode decomposition tables, so it does **not** depend on ICU, libc, a collation, or an extension (LOCAL: the result is identical under `COLLATE "C"`). It requires a **UTF8 server encoding** and raises an error otherwise. The Unicode version is whatever the server release ships (LOCAL: 16.0 on PG 18.3), so it can trail or lead a browser's by a few characters; that only affects which very new characters fold. Not portable from PGlite by assumption: the live server's major version and encoding must be read (preflight below). `lower()` is different: it does follow the database locale (worse case folding under a C locale, never a rejection).

### Access model

| Object | anon | authenticated |
| --- | --- | --- |
| `private.search_events` and its sequence | nothing | nothing |
| `public.search_history` | nothing | `SELECT`, `DELETE`, own rows (RLS) |
| `public.record_search`, `public.trending_searches` | `EXECUTE` | `EXECUTE` |
| `private.normalize_search_query`, `private.purge_search_events` | nothing | nothing |

`PUBLIC` execute is revoked on all four functions. Supabase's default privileges grant access on new `public` objects to the API roles, so every object is revoked explicitly before the narrow grants.

### `SECURITY DEFINER` functions (INSPECTED)

Both have `set search_path = ''`, schema-qualified references, no dynamic SQL, and grants to exactly `anon` and `authenticated`. Supabase's advisors are expected to flag both as executable by `anon`/`authenticated`: intentional.

- **`record_search`**: anonymous callers must append to a table they may not touch, and signed-in callers must write history without an INSERT/UPDATE grant (which would let them forge rows, timestamps and unbounded history). Identity comes only from `auth.uid()`; the caller supplies neither a user id, a timestamp nor the stored text; it returns nothing.
- **`trending_searches`**: reads a table clients cannot read; returns `(query, count)` only; `p_limit` is clamped to 1..20 inside.

### Behaviour of `record_search`

Invalid scope or `result_count` (null, negative, above 10,000) raises `22023`. A query that normalizes to `NULL` is an ordinary input and is a silent no-op. Otherwise an event is appended. **Anonymous:** nothing else. **Signed in:** take the per-user lock, upsert `(user_id, scope, query)` with `searched_at = clock_timestamp()`, delete everything outside the newest 20.

### Advisory lock and concurrency

`pg_advisory_xact_lock(hashtextextended('velora.search_history:' || auth.uid(), 0))`, one key per user, transaction-scoped, the same pattern and a different key prefix from the watchlist cap. Transaction-scoped locks are safe behind Supabase's transaction pooler (a session-level lock would not be). The hash only has to agree between transactions on the same server at the same time, so it does not need to be stable across versions; a collision could only serialize two unrelated users. The function takes this one lock and no other, so lock ordering cannot invert. The direct `DELETE` policy takes only row locks and never the advisory lock, so it cannot form a cycle with it. One theoretical deadlock exists: a search in flight while that user's `auth.users` row is deleted (foreign-key locking); account deletion does not exist yet (Phase 7) and PostgreSQL resolves it by aborting one transaction. Without the lock, N racing searches at 20 rows would leave 20 + N − 1 until the next search. Real concurrency is **NOT TESTED** (PGlite is single-connection); it is in the live plan.

### Retention (accurate wording)

- Trending considers only the last 7 days.
- Search history is bounded to 20 rows per authenticated user and is removed with the account.
- **Anonymous analytics events currently have no automatically enforced physical expiration.**
- `private.purge_search_events(p_older_than, p_batch)` provides bounded maintenance but is **not scheduled**. Its interval has no default, so the migration embeds no retention period.
- Automatic physical analytics retention is **operational/technical debt** (see below).

No document, comment or UI text may state a retention period unless automatic deletion is configured **and verified**.

**Why the purge function is in this migration at all.** It is the only bounded way to delete events (a hand-written `DELETE` on a large table is the risk it removes), it is tested, and it lets an operator clean up after an abuse flood without waiting for a new migration. It selects by the `created_at` index, deletes at most one batch (default 5,000, capped at 50,000), orders oldest first, and cannot reach the 7-day trending window (the cutoff is floored at 7 days). No `PUBLIC`, `anon` or `authenticated` `EXECUTE` (LOCAL: checked). Recommendation: keep it. The smaller alternative, omitting it until retention is designed, saves about fifteen lines and removes nothing that is currently needed, but leaves the only cleanup path as ad-hoc SQL.

### Trending, and what Checkpoint 4 must display

Database: events from the last 7 days, canonical query, `result_count > 0`, at least 3 events, ordered by count, then most recent event, then text; limit clamped to 1..20 (default 6). `result_count > 0` only saves verification calls; it skips events and never subtracts any.

**Checkpoint 4 display rules (replaces the current behaviour):**

1. Ask `trending_searches` for more than six candidates.
2. Verify each candidate against TMDB (`searchMedia`, the same URLs users click, so the hourly fetch cache is shared).
3. Show up to six verified candidates; **show fewer than six when fewer qualify**.
4. **Hide the section entirely when no verified Velora search qualifies.**
5. **No fallback.** TMDB trending media titles are never presented as Velora "Trending searches". The existing `TrendingSearches` component in `app/search/page.tsx` (TMDB titles under a "Trending searches" heading, present since Phase 1) is deleted in Checkpoint 4, not kept as a cold-start substitute. Until then it is known-mislabelled behaviour, carried as debt.
6. Cache the verified list for minutes rather than per page view.

Consequence, accepted: with no data the empty `/search` page shows only the input and the "Browse by genre" link.

### Abuse limits (documented, not solved)

The publishable key is public, so anyone can call `record_search` outside Velora. Mitigations that exist: all inputs are validated in the database, `result_count` is bounded, queries are normalized, trending uses a bounded window and a minimum count, and candidates are verified against TMDB before display. Known limitations:

- Scripted inflation is possible. "3 events" is not "3 people": there is no identifier by design.
- **Storage growth.** Nothing limits how many anonymous events a script can append, and nothing deletes them until the purge is scheduled. At roughly 150 bytes per event with its indexes, a few million events is hundreds of megabytes. Recommended before launch, not in this migration: schedule the purge (pg_cron) and watch the table size; optionally add a global per-minute write budget inside `record_search`, which would let anyone suppress recording for everyone, so it is a product decision.
- `trending_searches` is a public aggregate over the 7-day window; cost grows with volume. The API roles' `statement_timeout` is the backstop (read in the preflight), and a cached snapshot table is the later fix.
- The RPC itself is public, so a direct caller sees unverified candidates. Honest clients report the real result count, and personal strings usually return zero results, so they are excluded; that is a privacy help, not a guarantee.
- A still-valid token for a deleted user makes `record_search` fail with a foreign-key error and record nothing (LOCAL).

Deliberately not added: IP logging, fingerprinting, Redis, CAPTCHA, service-role dependency.

### Recording path for Checkpoint 3 (decision, not implemented)

Client island → `POST` to a small Route Handler → `record_search` with the user's session. The island renders after a successful search, gets `query`, `scope` and the item count as props, and fires after about 1.5 s; navigating to the next query unmounts it and cancels the timer, which drops partial prefixes. It de-duplicates per `(scope, query)` per browser session. No TMDB request is made on this path. Rejected: Server Actions (dispatched one at a time per client, may re-render), `after()` in the render (fires for every debounced prefix and for bots, writes behind a GET), and the SDK in the browser (about 66 KB for every guest).

This agrees with the Checkpoint 1 decision that recent searches use a client island and a Server Action gated on the session. Two items to test at Checkpoint 3 with real sessions: that a token refresh inside a Route Handler (cookies are writable there) does not race a concurrent Server Action refresh, and that the handler needs no `proxy.ts` change.

### Evidence

**LOCAL, 131 assertions, 0 failures** (PGlite, PostgreSQL 18.3 in WASM, `C.UTF-8`; scripts kept outside the repo). The stub reproduces the Supabase roles, `auth.uid()`, `auth.users` and the default grants to `anon`/`authenticated`; the three real migrations were applied in order. 108 cover normalization, grants (including a check shown to catch an unrevoked function), RLS isolation between two users, prune-to-20, trending and purge semantics and cascade on user deletion; 23 cover the invisible-character gate. A scan of **every** code point through the gate found no real letter or digit rejected (the only rejects are circled-digit symbols and the deliberately blocked fillers), and it is what led to blocking the invisible classes above.

**Migration file encoding.** The first version of the file contained literal zero-width and bidi characters inside three regular expressions, because the authoring tool decoded `\uXXXX` escapes; reviewers could not see them. The regexes are regenerated as ASCII escapes; the only non-ASCII bytes left are three visible characters in comments.

**Live status:** the structure, RLS, privileges and function security are VERIFIED live ("Applied and verified live"), and so is the behaviour under real sessions, data and concurrency ("Behavioural and adversarial verification (live)"). **Still NOT TESTED live:** index plans at real volume, and everything about the application wiring (Checkpoint 3).

### Application plan (steps 1 to 3 and 7 done; see "Applied and verified live")

Migration history is now reconciled for the two Phase 2 migrations (`313e621`). To keep it that way, apply this migration through the CLI (`supabase db push`), which records it, using the session-pooler URL if the machine is IPv4-only (`DIRECT_URL` resolves to IPv6 only). Applying it by other means (SQL editor, `psql`) needs a later `supabase migration repair`, which has not been authorized.

Order: (1) run the read-only preflight (below); (2) apply in one transaction; (3) catalog checks (RLS flags, ACLs, `proconfig`, exposed schemas); (4) Data API with real sessions: anonymous `record_search` succeeds, `private` and other users' rows are unreachable, own-row delete works; (5) 20+ parallel `record_search` calls from one user at 19 and 20 rows leave at most 20; (6) `trending_searches` with seeded events, then remove every seeded row (needs an administrative connection); (7) advisors, expecting only the two intentional `SECURITY DEFINER` warnings; (8) regenerate `database.types.ts`.

**Preflight (read-only, one transaction that is rolled back).** It reads the server version and encoding, evaluates the exact facilities the migration uses inline (NFKC, the `\u` and `\U` escapes inside classes, the blocklist, `lower()`), checks for name clashes and client `USAGE` on `private`, and reads role settings, default privileges and `pg_cron` availability. **Blockers if:** `server_version_num` < 130000, encoding is not UTF8, any of the first five probe columns is false, any name already exists, or a client role has `USAGE` on `private`. `lower_folds_non_ascii = false` is acceptable. The script was run locally inside a read-only transaction (LOCAL); it is in the Checkpoint 2 pre-apply report.

### Types

`lib/supabase/database.types.ts` is unchanged. It is hand-maintained; describing `search_history` and the RPC signatures before the migration exists would describe a schema that does not. It is updated in Checkpoint 3, after the migration is applied and verified.

### Integration into `phase3-discover` (done)

Done with `git stash push` limited to `docs/PHASE2_AUDIT.md`, `git switch -c phase3-discover --track origin/phase3-discover`, `git stash pop` (automatic merge) and this file copied back, with no merge, reset, rebase or cherry-pick. `HEAD` is `c5a9bbc` (equal to `origin/phase3-discover`); this file's diff against it is additions only. The migration and the audit changes are uncommitted. The uncommitted `docs/PHASE2_AUDIT.md` clarification (header debt, row 2) is legitimate and should be committed separately from the migration.

### Phase 3 technical debt and release-gate tracking

| # | Item | Status |
| --- | --- | --- |
| 1 | **Production build without Supabase variables fails at `/account`.** `assertAccountsAvailable` throws when `NODE_ENV=production` and Supabase is unset, and the page is otherwise prerendered. The keyless `npm run build` therefore fails, against the intent recorded in `next.config.ts` and the roadmap release gate (fresh clone: `npm ci` → lint → typecheck → build). Present since Phase 2; **not fixed here** | **Release-gate decision before Phase 3 close-out:** does the fresh-clone/guest-only gate require it? INSPECTED and reproduced |
| 2 | Anonymous analytics events have no automatic physical expiration; the purge is unscheduled | Operational debt; needed before any retention statement (Phase 7.6) |
| 3 | The current "Trending searches" block lists TMDB trending titles | Removed in Checkpoint 4 (see display rules) |
| 4 | Storage growth from scripted event inserts | Documented above; mitigation is scheduling plus monitoring |
| 5 | JavaScript-disabled rendering, stale client-side `robots`/canonical metadata after Discover filter changes, header layout at 768–960px | Accepted in Checkpoint 1 (items 1 to 3 above) and not addressed in Checkpoint 2 |
| 6 | Search history is user-linked personal data | Must appear in the privacy documentation (Phase 7.6); it is removed on account deletion |
| 7 | `private.purge_search_events(NULL, n)` resolves effectively to the 7-day floor. Private and unscheduled, so not a current production defect | Any future retention scheduler must pass an explicit, non-null retention interval; tightening needs a new forward migration (the applied migration is immutable) |

### Static checks (Checkpoint 2, pre-apply)

Run on the **combined** `phase3-discover` tree (Checkpoint 1 at `c5a9bbc` plus this checkpoint's files), with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:1`, a placeholder key, and the service-role and database URLs blanked, so no live credential was used (fully blank Supabase variables fail at `/account`; see debt item 1): `npm run lint`, `npm run typecheck`, `npm run build` and `git diff --check` all pass. The route table includes `/discover`.

Focused smoke check on a production server (`next start`, placeholder Supabase URL): `/discover` and four parameter variants (filtered TV, movie with year and rating, malformed parameters, page 2) return 200 with one `h1` and 20 titles; the default page has no `robots` tag and a canonical of `/discover`, filtered and paginated pages carry `noindex, follow` and a canonical to their own canonical URL, and malformed parameters fall back to the default canonical; the filter form (three selects, year input, Apply button) and the bottom-nav Discover link are present; `/search` and `/movies` still return 200. This is a regression smoke, not a repeat of the Checkpoint 1 browser audit.

### Live read-only preflight (2026-09-20)

Run through the Session Pooler with a Node runner: the reviewed `preflight.sql` verbatim, plus additional catalog queries, every one inside `BEGIN READ ONLY` … `ROLLBACK` (read-only asserted before each batch, and a keyword guard refused any statement containing DDL or write words). Nothing was created, changed or migrated. The normalization probes evaluated the three regular expressions read straight from the migration file as expressions, and were compared with the same expressions on PGlite. No credential, hostname or project identifier is recorded here.

**TLS:** the connection was encrypted, but the Node runner **did not verify the pooler's certificate chain**: verification failed (the pooler's certificate authority is not in Node's trust store) and the runner fell back to an unverified encrypted connection. The data read was non-secret catalog data, but the credential travelled over a channel whose server identity was not verified. Not a defect in the migration; a limitation of this runner (the CLI verifies TLS its own way).

| Item | VERIFIED live | LOCAL (PGlite) |
| --- | --- | --- |
| PostgreSQL | **17.6** (`server_version_num` 170006) | 18.3 |
| Server encoding | **UTF8** | UTF8 |
| Collation / ctype | **`en_US.UTF-8` / `en_US.UTF-8`**, default collation provider ICU (`en-US`) | `C.UTF-8` |
| `standard_conforming_strings` | **on** | on |
| Unicode tables (`unicode_version()`) | **15.1** | 16.0 |

**Feature probes, VERIFIED live (all true):** `normalize(…, NFKC)` folds compatibility forms; the `IS NFKC NORMALIZED` predicate works; unicode escapes (four digits) work inside bracket classes; astral escapes (eight digits) work inside bracket classes; non-Latin text survives the blocklist. `hashtextextended`, `pg_advisory_xact_lock(bigint)`, `normalize(text, text)` and `auth.uid()` exist.

**Lowercase probe: `false`, harmless, and a defect in the probe, not the database.** VERIFIED live at the byte level: É lowercases to `c3a9` (é) and Cyrillic folds correctly. A capital sigma at the end of a word lowercases to the **final sigma** (`cf82`, ς), because the ICU default collation applies the context-sensitive rule; the probe expected the plain σ (`cf83`), which PGlite's builtin locale produces. Dotted capital I lowercases to `i` plus a combining dot (`69cc87`). Consequence: none for acceptance or de-duplication. Only the database canonicalizes, so a Greek word ending in Σ is stored with ς consistently; the application must never compute or compare canonical forms itself (already the design).

**Multilingual probe table, VERIFIED live: 31 probes, 0 unexpected results.** Accepted with the expected canonical form: full-width Latin, ligature, NBSP and ideographic whitespace, Japanese, Korean, Cyrillic, Devanagari, Arabic, Persian (ZWNJ kept), astral CJK, an emoji flag with text, control characters and a bidi override removed, digits, circled digits, exactly 100 characters. Rejected: emoji-only, `!!`, `...`, dash/ellipsis, ZWSP-only, Hangul-filler-only, word-joiner-plus-BOM-only, private-use-only, one character, empty, whitespace-only, 101 characters, 501 characters. **Identical to PGlite on 30 of 31**; the only difference is the Greek final sigma above.

**Differences between live and PGlite that could matter:** PostgreSQL 17.6 versus 18.3; Unicode 15.1 versus 16.0 (affects only characters added in Unicode 16); ICU default collation versus builtin `C.UTF-8` (context-sensitive lowercase). None changed any acceptance decision.

**Collisions and exposure, VERIFIED live:** none of `private.search_events`, `public.search_history`, `record_search`, `trending_searches`, `normalize_search_query`, `purge_search_events`, the identity sequence or the index exists in any schema (functions and relations checked across all schemas). Schema `private` exists (owner `postgres`, ACL owner-only); `anon`, `authenticated` and `service_role` have no `USAGE` on it. The list of schemas exposed by the Data API is **not readable from the catalog** (no `pgrst.db_schemas` role setting), so it was not re-confirmed here (Phase 2 verified it through the API); the missing `USAGE` on `private` denies access even if it were exposed.

**Default privileges, VERIFIED live:** objects created in `private` by `postgres` or `supabase_admin` receive **no** default ACL entries (PostgreSQL's built-in `PUBLIC` execute on new functions applies and is revoked by the migration). Objects created in `public` receive full table, sequence and function privileges for `anon`, `authenticated` and `service_role` by default, which is exactly what the migration's explicit `revoke all … from public, anon, authenticated` (followed by narrow grants) undoes. `service_role` keeps its defaults and bypasses RLS; not a client defect. `postgres` is not a superuser but has `BYPASSRLS`, so its `SECURITY DEFINER` functions bypass RLS as designed.

**Migration history, VERIFIED live:** `supabase_migrations.schema_migrations` holds `20260919000000` (`profiles_and_watchlist`) and `20260920000000` (`watchlist_limit_lock`); the latest recorded is `20260920000000`, so `20260920181819` applies next. **`pg_cron`:** available (1.6.4), not installed (informational; not enabled). Installed extensions: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.

**Phase 2 security objects, VERIFIED live, present:** `profiles` (RLS on, 2 policies) and `watchlist_items` (RLS on, 3 policies); `anon` has nothing; `authenticated` has `SELECT` on `profiles` and `SELECT`, `INSERT`, `DELETE` on `watchlist_items`; the three triggers are enabled; `handle_new_user` is `SECURITY DEFINER` with an empty `search_path` and an ACL of `postgres` only; `set_updated_at` and `enforce_watchlist_limit` have an empty `search_path`, are not `SECURITY DEFINER`, and carry the default `PUBLIC` execute (unreachable without `USAGE` on `private`; already noted in Phase 2). `auth.uid()` reads only the JWT claims (`request.jwt.claim.sub` or `request.jwt.claims`).

**Timeouts, VERIFIED live:** `statement_timeout` is 3 s for `anon` and 8 s for `authenticated`, which resolves the earlier "to be confirmed" backstop for the public trending aggregate. `authenticator` also carries `lock_timeout=8s`, which bounds a wait on the per-user advisory lock (its critical section is two short statements). The `safeupdate` extension is preloaded, which is why a history `DELETE` needs a filter.

**Every required preflight condition passed** (version 13 or later, UTF8, all probes, no name clashes, `private` present with no client `USAGE`, Phase 2 objects intact). **NOT TESTED at this point:** everything about the Phase 3 objects, which did not exist yet.

### Applied and verified live (2026-09-20/21)

**Mechanism.** Supabase CLI 2.117.0, installed in a scratch directory (not a project dependency), `supabase db push --skip-vault --db-url <Session Pooler string from the local environment, never printed>`. A `--dry-run` first listed exactly one migration (`20260920181819_search_analytics_and_history.sql`, no seeds, no roles); the real push then applied exactly that one and exited 0. The file's SHA-256 was re-checked immediately before the push. Not used: `DIRECT_URL`, the service-role key, `migration repair`, ad-hoc SQL, any other migration. The push ran in the CLI's own connection; the verification runner below is a separate Node client that connected encrypted but **did not verify the pooler's certificate chain** (as in the preflight).

**Verification: 56 read-only checks, 0 failed** (every statement inside `BEGIN READ ONLY` ... `ROLLBACK`, guarded against write keywords; the connection was slow that evening, which is why the runner needs long timeouts). VERIFIED live, from the catalog and not inferred from the file:

- **History:** `schema_migrations` holds `20260919000000`, `20260920000000` and `20260920181819` (`search_analytics_and_history`, 22 statements); the latest applied is the new one. The recorded statements contain the reviewed bodies of all four functions.
- **Objects (exactly the expected set):** `private.search_events` (owner `postgres`), its identity sequence `search_events_id_seq`, `search_events_pkey`, `search_events_created_at_idx` (btree on `created_at`), `public.search_history` with `search_history_pkey (user_id, scope, query)` and a foreign key to `auth.users` `ON DELETE CASCADE`, and four functions. Functions in `public` and `private` are exactly the three Phase 2 ones plus the four new ones, all owned by `postgres`. Nothing else named `search_*` exists in any schema. Columns, types, nullability, defaults and the `GENERATED ALWAYS` identity match the migration; `search_events` has no identity-revealing column; the table `CHECK` constraints are present; there are no triggers on the new tables.
- **RLS:** enabled (not forced) on both tables. `search_events` has **no** policies. `search_history` has exactly two, both permissive and `TO authenticated`: "read own" (SELECT) and "remove own" (DELETE), each `(SELECT auth.uid()) = user_id`. No INSERT, UPDATE or ALL policy.
- **Privileges:** `anon` and `PUBLIC` have nothing on either table; `authenticated` has exactly `SELECT` and `DELETE` on `search_history` and nothing on `search_events`; no client privilege of any kind on `search_events_id_seq`; no column-level grants; `anon` and `authenticated` still have no `USAGE` on `private`. `service_role` holds Supabase's default full table privileges on `search_history` (and bypasses RLS): not a client defect, and its key is never used by the app.
- **Functions:** `normalize_search_query` (not `SECURITY DEFINER`, empty `search_path`, IMMUTABLE STRICT PARALLEL SAFE) and `purge_search_events(p_older_than interval, p_batch integer DEFAULT 5000)` (not `SECURITY DEFINER`, empty `search_path`, **no default retention interval**) have `EXECUTE` for `postgres` only. `record_search(p_query text, p_scope text, p_result_count integer) returns void` and `trending_searches(p_limit integer DEFAULT 6) returns TABLE(query text, search_count bigint)` (STABLE) are `SECURITY DEFINER` with an empty `search_path`, and `EXECUTE` goes to `anon`, `authenticated`, `postgres` and `service_role`, **never `PUBLIC`**. The live `prosrc` of all four is **byte-identical** to the reviewed migration bodies.
- **Normalization through the installed function:** 36 probes (the 31 from the preflight plus mixed whitespace runs, a 500-character raw input that collapses to a two-letter query, and 501 and 600 raw characters, which the raw guard rejects) all produce the expected result, are identical to the pre-apply expression results on the live server, and differ from PGlite only on the Greek final sigma. A 100-character query is accepted; 101 is rejected.
- **Read-only role probes** (`SET LOCAL ROLE` inside a read-only transaction; nothing written): `anon` and `authenticated` can call `trending_searches` (the argument is clamped: 1,000,000 returns at most 20 rows; the table is empty, so the result is not behavioural verification); both are denied (`42501`) on `private.search_events`, `private.normalize_search_query` and `private.purge_search_events`; `anon` is denied on `search_history`; `authenticated` with no JWT subject can read it and RLS returns 0 rows.

**Advisors** (`supabase db advisors --type security --level info`, read-only): one finding, **new and intentional**: `rls_enabled_no_policy` (INFO) on `private.search_events`, which is exactly the intended deny-all-by-default posture (RLS on, no policy, no client privileges). No finding on any Phase 2 object and none on `record_search` or `trending_searches` (I had expected the "SECURITY DEFINER function executable by anon/authenticated" warnings; this CLI's security advisor did not raise them). Performance advisors were not run. No production object was patched.

**Static gates on the post-apply tree** (`phase3-discover` at `c5a9bbc` plus this checkpoint's files; placeholder Supabase URL, no live credential): `npm run lint`, `npm run typecheck`, `npm run build` and `git diff --check` pass.

**Behaviour** (`record_search`, history, trending, concurrency, the purge) is recorded in the next section.

### Behavioural and adversarial verification (live, 2026-09-21)

**Result: 0 database defects found. Every behavioural check passed live; all test data was removed and the baselines were restored.**

**Method.** A Node harness kept outside the repository (it uses `pg` from a scratch directory and the project's own `@supabase/supabase-js`; no dependency was added). Two disposable users were created through the Auth admin API with synthetic addresses (`velora-cp2-test-<run tag>-a` and `-b`) and random in-memory passwords; their redacted ids end in `...5fbe02` and `...bfc1df`. The service-role key was used **only** to create and delete those two users. Every RPC and Data API call used the publishable key and each user's own session token, which is the path the application will use. An owner-level connection (Session Pooler) was used only to read hidden state, to seed controlled analytics rows for the aggregate test, and to clean up. Every test query carried a per-run tag so all test rows were identifiable. The one pre-existing real account was never read or modified. No credential, token, URL or hostname was printed or written to disk (the harness redacts every output; a scan of all output files found none).

**Baseline.** Branch `phase3-discover`, HEAD `c5a9bbc`, applied migration unchanged (SHA-256 `637c7855...ae2c`); `private.search_events` 0 rows; 1 real account, 1 profile, 2 watchlist rows, 0 history rows. Migration history: three versions, latest `20260920181819`.

**Identities (VERIFIED live).** Both users obtained independent authenticated sessions: `role` `authenticated`, not anonymous, no `service_role` claim, token subject equal to the user's own id, and the Auth server confirmed each identity. The Phase 2 trigger created a profile for each.

**Guest `record_search` (VERIFIED live).** HTTP 204; exactly one event appended; no history row created; the event holds only `id`, `query`, `scope`, `result_count`, `created_at`, with the canonical query, the scope and the bounded count as sent and `created_at` inside the database-clock window of the call; the table has no user, session, IP, user-agent, token or fingerprint column. **Normalization through the RPC**, stored value read back: full-width Latin, ligature, tabs/NBSP/ideographic space/newline with mixed case, Japanese, Korean, Cyrillic (lowercased), Devanagari, Arabic, Persian (ZWNJ kept), a zero-width space and a control character inside a word (removed), a bidi override (removed), circled digits (folded), an emoji flag sequence with text (kept), and accented Latin (case-folded) all stored exactly as the contract says; a Greek word ends in the final sigma (informational). Scope and count preserved.

**Invalid input (VERIFIED live), with event and history counts checked around every call, no partial write in any case.** Raise `22023`: invalid scope, `ALL` (case-sensitive), NULL and empty scope, count -1, 10001, 2147483647 and NULL. Non-integer counts (`1.5`, `'abc'`) fail earlier with `22P02` (the type cast), a NUL character with `22P05`, a lone surrogate is rejected by PostgREST before it reaches the database (`PGRST102`), and a missing argument or a caller-supplied `p_user_id` or `p_searched_at` does not match any signature (`PGRST202`). Silent no-ops (no error, nothing written): NULL query, `!!`, `...`, one character, one full-width character, empty, whitespace-only, emoji-only, ZWSP-only, Hangul-filler-only, word-joiner-plus-BOM-only, private-use-only, 501 and 5,000 raw characters, a 608-character raw input, and a canonical form of 101 characters. Accepted: a canonical form of exactly 100 characters, and counts 0 and 10000.

**Authenticated recording, user A (VERIFIED live).** One event and one history row; the query is canonicalized by the database and the scope kept; `searched_at` is database-generated (inside the database-clock window); A reads the same row through the Data API. Forging is impossible: `p_user_id` and a timestamp do not exist as parameters (`PGRST202`) and nothing was written. Repeating the same `(scope, query)` adds an analytics event, keeps one history row and advances `searched_at`; the same query under `movie` and `tv` creates distinct rows; case and whitespace variants collapse onto the same key. Authenticated invalid calls raise `22023` or no-op and write nothing.

**Two-user isolation (VERIFIED live, Data API with real sessions).** A sees only A's rows and B only B's (also when filtering for the other's id). Cross-deletes affect 0 rows in both directions. When B deletes a key it shares with A, only B's own row goes. Each user can delete its own row. Direct `INSERT` (own and spoofed owner), `UPDATE` and `UPSERT` on `search_history` are denied with `42501`, leaving data unchanged; a guest is denied `SELECT` and `DELETE`. **`private` through PostgREST:** `schema('private')` reads by a user and by a guest are refused (`PGRST106`, HTTP 406, no data); `search_events` does not exist in `public` (`PGRST205`); the internal functions do not exist in the public API (`PGRST202`) and are refused in the `private` profile (`PGRST106`). The analytics table was untouched by all of it.

**Exact 20-row bound (VERIFIED live).** After 25 sequential distinct recordings across all three scopes the history holds exactly the newest 20 in recency order, the oldest 5 pruned, and analytics kept one event per recording. Re-searching the oldest kept entry keeps 20 rows and makes it newest; re-searching a pruned entry re-adds it as newest and prunes the then-oldest; refreshing the newest advances its timestamp.

**Concurrency and the advisory lock (VERIFIED live; a required acceptance gate).** Bursts issued together from separate concurrent HTTP requests (peak in flight equal to the burst size), against a history already at 20 rows: **24** distinct queries; **30** requests as 15 queries each issued twice concurrently; **44** requests as 22 for each of two users at once; and 6 more during the lock test. In every burst: 0 errors (no deadlock `40P01`, no lock timeout `55P03`, no statement timeout `57014`, no unique violation even for concurrent duplicates), the history was **exactly 20 rows**, no duplicate key, all timestamps distinct, and the analytics table counted every successful call; after burst 1 all 20 retained rows came from the burst, and the two users never affected each other. **Lock-hold proof:** with an owner connection holding A's advisory lock, 6 concurrent `record_search` calls for A were blocked (the server showed 6 waiters on an advisory lock in both `pg_locks` and `pg_stat_activity`; none returned, and their events were not visible), while B's call, on a different key, finished in about 300 ms. After release all 6 succeeded (each had waited about 2.7 s) and A held exactly 20 rows. **Honest limits:** in the unheld bursts the server-side overlap cannot be observed independently (requests take 0.3 to 1 s each end to end), so the deterministic lock-hold test is what proves the mechanism and the bursts show the invariants hold under load. A no-lock control was not run: it would need a modified function, and the applied migration is immutable.

**Trending, from seeded controlled events (VERIFIED live).** Guest and signed-in callers get identical, deterministic results, and the output has exactly the columns `query` and `search_count`. Verified: count-then-recency-then-text ordering including a tie-break; the minimum of 3 events (exactly 3 qualifies, 2 does not); `result_count > 0` (all-zero and mostly-zero queries excluded); the 7-day window with boundary probes on both sides (3 events just inside are counted, 3 just outside are not; 6 events 8 days old and 2-of-6 in-window excluded); a candidate recorded through the real public RPC qualifies. Limits: the default is 6 (argument omitted or NULL), 0 and negative values give 1 row, and with 23 candidates `p_limit` of 21, 1,000,000 and 2147483647 all return exactly 20, the true top 20.

**Purge (VERIFIED live; my addition, run entirely inside a transaction that was rolled back).** Batch bound (batch 5 deletes exactly 5), oldest-first ordering, batch 0 and negative clamped to 1, an oversized batch clamped without error, and the 7-day floor (a cutoff of `'0 seconds'` deletes only rows older than 7 days and never recent ones). Afterwards no purge-test row existed and the table was exactly as before.

**Cleanup (VERIFIED live).** Both users were deleted through the Auth admin API, their profiles, history rows, sessions and identities were gone (cascade), and neither could sign in again. The tagged analytics rows were deleted; an independent recheck showed `private.search_events` 0 rows, `auth.users` 1, `profiles` 1, `watchlist_items` 2, `search_history` 0, migration history unchanged, and the disposable-credential state file deleted.

**Findings.** No database defect. Notes for the record:

1. `private.purge_search_events(NULL, n)` currently resolves effectively to the 7-day floor (`greatest` ignores NULL), so a scheduler that passed NULL would delete everything older than 7 days. The function is private (no client `EXECUTE`) and unscheduled, so this is **not a current production defect**. Any future retention scheduler must pass an explicit, non-null retention interval. Tightening this behaviour later requires a new forward migration; the applied migration is not edited.
2. Input-type errors surface as `22P02` (non-integer counts) or `22P05` (NUL) rather than the function's own `22023`; nothing is written either way.
3. The first run of the concurrency phase reported ten failures. They were my harness's mistake (test names written with capital letters while the database correctly lowercases the canonical query, so exact-match and `LIKE` counts were 0). I confirmed that from the actual rows (the analytics counts were exactly 24, 30, 44 and 6, and both histories were exactly 20) before fixing the harness and rerunning the phase in full: 35 of 35 passed.

**Not covered by this verification.** The client island, the Route Handler and token refresh inside a Route Handler (Checkpoint 3); the behaviour of a still-valid token belonging to a deleted user (the foreign-key failure is local-only evidence); index plans, performance and storage growth at real volume; PostgREST pool exhaustion under much larger bursts; sustained-load timeouts; the unverified certificate chain of the Node runner's TLS connection; regeneration of `database.types.ts`.

---

## Checkpoint 3 — Application integration: search recording and recent-search history

**Status: implemented and verified against the live project; uncommitted.** No database change, no migration, no new dependency. `private`, RLS and grants were not touched. The service-role key was used only inside an out-of-repo test harness to create and delete four disposable users; the application server was always started with the service-role key and both database URLs blanked, and a scan of the production build found none of them (see Security).

Legend as above. **LOCAL** was not used in this checkpoint: everything ran against the live project and a production build. Method: `next build` + `next start`, real Edge via `playwright-core`, axe-core; the harness lives outside the repo (as in Phase 2 and Checkpoint 2). Disposable users had synthetic addresses, signed in through the real sign-in form or through `@supabase/ssr` exactly as the app's server client does, and were deleted afterwards. Every test query carried a per-run tag or was removed by name. The live database was snapshotted before and after: **identical** (0 events, 0 history rows, 1 real account, 1 profile, 2 watchlist rows, the same three migrations). The identity sequence of `private.search_events` advanced (harmless).

### Files

New: `app/api/search-events/route.ts`, `components/search-recorder.tsx`, `components/recent-searches.tsx`, `lib/search-history-actions.ts`.
Changed: `app/search/page.tsx`, `lib/schemas.ts`, `lib/utils.ts`, `types/media.ts`, `lib/supabase/database.types.ts`. Nothing else.

### Architecture

```text
/search (Server Component: still session-free, still one TMDB call)
 |- SearchResults --TMDB ok--> <SearchRecorder query scope resultCount/>   client island, renders null
 |                                  | 1.5 s dwell, once per tab session
 |                                  v
 |                    POST /api/search-events (Route Handler) --> supabase.rpc("record_search")  (user's cookie session)
 '- (empty query) --> <RecentSearches/>   client island, gated on useSession() === "signed-in"
                          | Server Actions: loadSearchHistory / removeSearchHistory  (getAuthedClient, RLS)
```

* `/search` keeps **no** session read, no `proxy.ts` change and no `cookies()` call; it was already dynamic (`ƒ`) and still is. A failed TMDB search renders its existing error state **without** the recorder. The count is `items.length` of the page that was rendered, so there is no extra TMDB request.
* Guests download no Supabase SDK for this feature. For signed-in users the SDK loads exactly as before (header account link).
* History uses Server Actions rather than a second Route Handler, as decided in the Checkpoint 1 investigation: an expired token is refreshed where cookies are writable, and Next's built-in Origin check protects them. Recording uses a Route Handler, as decided in Checkpoint 2, so it does not queue behind other Server Actions.

### Route Handler contract (`POST /api/search-events`)

Body: `{ "query": string, "scope": "all" | "movie" | "tv", "resultCount": integer 0..10000 }`, **strict**: any other key, including a user id or a timestamp, is a 400. Query is checked for shape only (non-empty, at most 100 code points); the database alone canonicalizes and decides whether it is meaningful. Responses are bare statuses with `Cache-Control: no-store` and an empty body.

| Status | Meaning |
| --- | --- |
| 204 | Accepted (also when the database silently drops a meaningless query such as `!!`) |
| 400 | Not JSON, wrong shape, extra key, bad scope, count or query |
| 403 | `Sec-Fetch-Site` present and not `same-origin` |
| 405 | Any method other than POST (Next's default) |
| 413 | Body over 2,048 characters |
| 415 | Content-Type is not `application/json` |
| 502 | Supabase refused the call (see the stale-identity table); the query and the upstream message are neither logged nor returned |
| 503 | Supabase not configured |

**CSRF.** Route Handlers get no Origin check from Next.js (only Server Actions do; installed docs, `data-security.md`). The handler therefore requires JSON (a cross-origin browser needs a preflight, which the route never answers: VERIFIED, `OPTIONS` returns no CORS headers), rejects cross-site `Sec-Fetch-Site`, and relies on the SameSite=Lax session cookie (VERIFIED on the refreshed cookies). Not covered: a very old browser without `Sec-Fetch-Site` sending a cross-origin request; the JSON requirement and Lax cookies still block it in theory.

### Recording semantics (VERIFIED, real browser)

* Fires **once, about 1.5 s after the results render** (measured 1,482 ms); nothing is sent during the first second.
* The payload is exactly `{query, scope, resultCount}`: no id, no timestamp, no result objects. The guest request carries no auth cookie.
* Typing through prefixes (`inc`, `ince`, `incep`, `inception`, pausing less than the dwell) records **only** `inception`. Navigating away before the dwell records nothing. An empty search (with or without a scope) records nothing. A TMDB failure shows the existing error state and records nothing (second server with an invalid TMDB token).
* A search with **zero results is recorded, with count 0**. This matches the Checkpoint 2 design: trending filters on `result_count > 0`.
* **Result count** is the number of items on the rendered page (at most 20), clamped to 0..10,000 before sending. It is a display and analysis hint, **not** the total number of matches, and the database treats it as untrusted. The database function was not changed.
* **Dedupe:** one recording per exact `(scope, query)` text per **tab session** (`sessionStorage`, at most 50 remembered, with an in-memory fallback when storage is unavailable). Verified: reload, navigate away and back, and switching scope back and forth send nothing extra; the same query under another scope is recorded; a **new tab** records again (it is a new browser session); with `sessionStorage` blocked it still records once and raises no error. No library, no `localStorage`, no identifier. React StrictMode in development still sends exactly one request.

### Authenticated recording (VERIFIED, live, real sign-in form)

Recording creates history under the signed-in user, canonicalized by the database (`Alpha  Query` becomes `alpha query`). The same `(scope, query)` refreshes instead of duplicating; the same query under another scope is a separate row; ordering is newest first. A payload naming another user's id is rejected (400) and writes nothing.

### Stale, rotated and invalid identity (VERIFIED, live)

The invariant that matters held: **no history row was ever created for another user, and none for anyone in any of these cases (0 new rows across all of them).** The outcomes below are what Supabase actually produces; nothing in the handler forces them.

| Cookie / session | Handler status | Analytics event | History |
| --- | --- | --- | --- |
| No cookie (guest) | 204 | recorded, anonymous | none |
| Valid session | 204 | recorded | under that user |
| **Expired access token, valid refresh token** | 204 | recorded | under that user; the handler wrote a **rotated** session cookie (new refresh token) to its response, and that cookie is itself valid |
| **5 concurrent requests sharing one expired cookie** | 204 x5 | 5 | all 5 under that user; the Auth server still confirms the session afterwards |
| Unreadable cookie value (garbage, base64 that is not JSON) | 204 | recorded **anonymously** (the SDK treats it as no session) | none |
| Token with a corrupted signature | **502** | **none** (PostgREST rejects the token) | none |
| Token payload edited to name a different user | **502** | none | none, for anyone |
| Expired access token + **revoked** refresh token | 204 | recorded **anonymously**; the auth cookie is cleared | none |
| **Valid token, user deleted afterwards** | **502** | **none** | none: `record_search` is one transaction and the foreign-key failure rolls the whole call back (this was LOCAL-only evidence in Checkpoint 2; now VERIFIED live) |

Notes: an unreadable or revoked session degrades to anonymous analytics, which carries no identity. A deleted user's token is refused until it expires (at most about an hour) and the UI says nothing (see below). A caller holding a valid token can tell "my account is gone" from the status; nobody without that token can probe whether an account exists.

**Refresh races (VERIFIED at two levels).** (1) The Route Handler alone, above. (2) In a real browser with the access token set to expired: the browser SDK (`useSession`), the `loadSearchHistory` Server Action and the Route Handler all refresh close together. The history list still loads, the recording returns 204 and lands under the right user, the browser ends up with a rotated refresh token and a future expiry, the Auth server confirms the user, and after a reload the user is still signed in. This is consistent with Supabase's refresh-token reuse window. **No `proxy.ts` change is needed**, because the handler refreshes where cookies are writable. NOT TESTED: refresh after the reuse window has elapsed.

### Recent-search history (VERIFIED, live, real browser)

* Gated on `useSession() === "signed-in"`. Guests render nothing and make **no request and no Server Action call**. Loaded once per mount through `loadSearchHistory` (`select scope, query`, newest first, limit 20). Shown only in the empty-query state and placed **after** the existing Trending block, so nothing already on screen moves when it appears.
* Each row shows the query and its scope (`inception  Movies`); a signed-in user with no history sees a one-line explanation instead of a blank box. The stored query is the database's canonical form (lowercase), so rows and the re-run search are lowercase; TMDB search is case-insensitive.
* Selecting a row goes to `/search?q=<query>&type=<scope>` through the new shared `searchHref` (the result tabs now use it too). Verified: URL, active scope tab and search-box value.
* **Delete** (`removeSearchHistory`; own rows by RLS; the action takes only `{scope, query}`): optimistic; removed from the UI and the database; another user's row with the same key is unaffected (two users tested); focus moves to the neighbouring row, or to the empty-state note when the last entry goes; works from the keyboard (Tab to the row's remove button, Enter).
* **Delete failure:** the row is restored **in its original position**, an accessible `role="alert"` says so, focus returns to that row's remove button, the database row is intact, and a retry after the outage succeeds and clears the alert.
* **History load failure:** the section is simply absent; no error UI; search works normally.
* **A deleted user's still-valid session in a browser:** search works, the recording call is refused (502) and nothing is shown to the user; the history area shows the empty note (the read is authorized by a locally verified token, so it cannot tell). Cosmetic and short-lived.
* Not added: "clear all". Individual delete is sufficient and needs nothing beyond the existing DELETE-own policy.

### Database types

`supabase gen types typescript --schema public` (CLI 2.117.0, postgres-meta 0.99.0) ran against the live project. It needs Docker (the CLI runs postgres-meta in a container). The result is clean: three tables (`profiles`, `watchlist_items`, `search_history`) and two functions (`record_search`, `trending_searches`); **no `private` and no `graphql_public`**. It was **not accepted wholesale**: the generated file is 229 lines against 45, and a straight replacement would (1) widen the Phase 2 `media_type` union to `string`, which breaks typecheck in `lib/watchlist-actions.ts`, (2) drop the `Insert: never` and `Update` narrowing that encodes column-level grants, and (3) add about 110 lines of helper types that nothing imports. So the Phase 3 objects were taken from the generator **verbatim** into the existing file, with one deliberate exception: `search_history` `Insert` and `Update` are `never` (clients hold no such grant, so a stray `.insert()` should fail typecheck). The file header records both provenances. **Decision (accepted at close-out): keep this hybrid.** The full generated output is not adopted and no override or type-generation architecture is introduced in Checkpoint 3. The file header now states what a maintainer needs: it holds generated shapes plus deliberate restrictions, `search_history` `Insert`/`Update` are `never` on purpose, and a regeneration must be diff-reviewed, never pasted over the file. `media_type` remains `"movie" | "tv"` and the Phase 2 `Insert`/`Update` grant-encoding types are unchanged.

### Security (VERIFIED unless stated)

* **No service-role key or database URL reaches the application runtime.** No source file references them (grep); the application server ran with them blanked; a scan of every file in `.next/static` (23) and `.next/server` (234) found none of: the service-role key, the database password, either database URL, the Resend key, or the TMDB credentials.
* **No user id is trusted from a request:** the body schema is strict; the history actions accept only `{scope, query}`; identity is the cookie session, verified by PostgREST and by `getClaims`.
* **All writes go through `record_search`**, except the user's own RLS-protected history `DELETE`. Application code contains no insert, update or upsert on either table, and no reference to `search_events` at all.
* **Data API surface re-checked with the publishable key:** `private` is refused (406), there is no public `search_events`, the internal normalizer is not callable, anon can neither insert into nor read `search_history`, and `record_search` has no user-id parameter.
* Logging: the handler logs only an error code, never the query or the upstream message. (The existing search page still logs the query text when TMDB fails; unchanged.)
* No RLS, grant or migration change; no migration file is modified.

### Bundle (guest; same method before and after)

Production build, fresh Edge context, `load` plus a 3.5 s settle, sum of the gzip size of every distinct JS response. The "before" run is the unmodified `HEAD` build.

| Page | Before (gzip) | After (gzip) | Change | Supabase SDK loaded |
| --- | --- | --- | --- | --- |
| `/search?q=inception` | 147.7 KB (485.4 KB raw, 10 scripts) | 149.6 KB (490.4 KB raw, 10 scripts) | **+1.9 KB** | no, before or after |
| `/search` | 147.7 KB | 149.6 KB | +1.9 KB | no |
| `/` | 146.3 KB | 146.4 KB | +0.1 KB | no |

The `/` figure equals the Phase 2 and Checkpoint 1 audits, which validates the method. The extra 1.9 KB is the two islands. `RecentSearches` is statically imported, so guests download its list code although they never render it; lazy-loading it would save roughly 1 KB and was not done, because that is below the "meaningful benefit" bar in `AGENTS.md` (section 18). This is a bundle measurement, not a performance claim.

### Responsive and accessibility (VERIFIED)

Signed-in `/search` with six worst-case entries (100 unbroken characters, CJK, emoji, a long multi-word TV title) at 320, 375, 768 and 1440 px: no horizontal overflow, one `h1`, every remove button 44 by 44 and inside the viewport, every row link 48 px, long entries ellipsised with the scope label kept, **axe (WCAG 2.1 A/AA plus best practice) reported 0 violations at all four widths**, no page errors. Keyboard: Tab visits each row's link and then its remove button, in order, and every stop shows the focus ring. The link's accessible name is `dune in All`, the button's is `Remove “dune” in All from recent searches`, and the section is a named region with a heading and a list. Guest `/search` and `/search?q=inception` at the same four widths: no overflow, one `h1`, axe clean, structure unchanged (`Search`, `Trending searches`), no history UI. Screenshots were reviewed at 320 and 1440. INSPECTED only: real screen reader and mobile keyboard behaviour. The known 768 to 960 px header compression was not touched and this checkpoint does not affect it.

### Test totals

Route Handler contract and auth matrix **74/74**; guest browser **28/28**; signed-in browser **44/44**; responsive and accessibility **34/34**; Data API surface **6/6**; the development-mode StrictMode single-POST check passed.

Four harness defects were found and fixed along the way, all in the tests and none in the application: Next's own empty route announcer counted as an alert; a sign-in wait that matched the sign-in URL itself (the harness raced ahead and briefly tested a guest); and two keyboard assertions that filtered on truncated text. Each was diagnosed from evidence before anything was changed, and the whole suite was rerun.

### Quality gates (final tree)

`npm run lint`, `npm run typecheck`, `npm run build` (service-role key and database URLs blanked; the route table shows `ƒ /api/search-events` and `/search` still `ƒ`) and `git diff --check` all pass. The four new untracked files were also checked for whitespace and line endings separately, because `git diff --check` does not cover untracked files.

### NOT TESTED

* Refresh-token behaviour after the reuse window; token refresh on the production host (Vercel) as opposed to local `next start`.
* Real devices, real screen readers, mobile keyboard behaviour.
* Fresh-checkout behaviour with **no** Supabase variables (by inspection the recorder returns early and the history island renders nothing; not run, because the keyless production build fails at `/account`, item 1 of the debt table).
* Sustained load, or the real `statement_timeout` (3 s for the anonymous role) hit from the handler.
* A request from a real second origin (the checks cover the headers and the missing CORS grant, not a live cross-site page).
* The Node harness's TLS connection to the pooler still did not verify the certificate chain (same limitation as the earlier checkpoints); it carried only test data, owner-level reads and cleanup.

### Technical debt and decisions to note

1. **RELEASE / PUBLIC-EXPOSURE BLOCKER: analytics retention is not scheduled.** Until this checkpoint nothing wrote to `private.search_events`; now every search that dwells 1.5 s does, so debt items 2 and 4 above (no scheduled purge, unbounded scripted growth) are live. The application must not be publicly exposed, and Phase 3 must not be released, until retention is in place. It is deliberately **not** handled here: `private.purge_search_events` is not scheduled and no migration was created at close-out. It will be a bounded operational task before Phase 3 release. Requirement carried forward (debt item 7 above): any scheduler must pass an **explicit, non-null** retention interval (a NULL currently collapses to the 7-day floor), and the schedule must be verified to run before any document states a retention period.
2. **Dedupe suppresses repeat searches by design.** Repeated searches for the same `(scope, query)` in the same tab session are intentionally not re-sent, so they do **not** refresh history recency. A guest who searched, signed in and searched the same text in the same tab likewise gets no history row until the tab session ends. Accepted for lightness and not to be fixed in Checkpoint 3.
3. `resultCount` is the rendered page's item count (at most 20), not a total. It is enough for the `> 0` trending filter; a real total means extending `MediaPage`.
4. A deleted user's token is accepted by the header and the history island until it expires (identity is verified locally) while recording is refused (502). Pre-existing design; cosmetic here.
5. `database.types.ts` is a hybrid (see Database types). Generating types needs Docker Desktop and its `postgres-meta` image; the workflow is not scripted in the repository.
6. History sits below the (placeholder) Trending block to avoid layout shift. Checkpoint 4 removes that placeholder, after which the order should be reviewed.
7. History shows the canonical lowercase query.
8. The two islands add 1.9 KB gzip for guests.
9. The `TrendingSearches` placeholder is untouched and not coupled to the new code, as required.

### Close-out (Checkpoint 3 accepted)

* **Types:** the hybrid `lib/supabase/database.types.ts` is kept (see Database types). The header comment was shortened to what a maintainer needs; no type changed.
* **Retention** is recorded above (technical debt item 1) as a release and public-exposure blocker. Nothing was scheduled and no migration was created at close-out. Any scheduler must pass an explicit, non-null retention interval.
* **Dedupe** consequence is recorded above (technical debt item 2) as intentional and not fixed in this checkpoint.
* **Final review:** the change set is exactly the four new files plus `app/search/page.tsx`, `lib/schemas.ts`, `lib/utils.ts`, `types/media.ts`, `lib/supabase/database.types.ts` and this file. The security properties were re-checked against the final code by search: the body schema is strict and the RPC arguments are built only from the parsed query, scope and count; the handler uses the ordinary cookie-aware server client; no service-role key, database URL or Resend key is referenced anywhere in `app`, `lib`, `components`, `types`, `proxy.ts` or `next.config.ts`; the feature contains no insert, update or upsert (its only table operations are `select` and `delete` on `search_history`); there is no access to `private`; `app/search/page.tsx` imports nothing session-related and the `proxy.ts` matcher is unchanged.
* **Final gates:** `npm run lint`, `npm run typecheck`, `npm run build` and `git diff --check` pass; the new files have no whitespace warnings.
* **Focused smoke (rebuilt production server, no users created):** the identity-free contract still answers 400 for an extra user-id key, 400 for an extra timestamp key, 415, 403 and 405; `/search?q=<tagged>` produces exactly one `POST /api/search-events` returning 204 with no Supabase SDK for a guest (149.6 KB gzip, unchanged); empty `/search` sends nothing. The single test event was removed and the database matches the pre-checkpoint snapshot again.
