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
