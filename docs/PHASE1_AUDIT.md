# Phase 1 Audit — Foundation & Discovery

Scope: roadmap items 1.1–1.11 against the existing app. Method: production build served locally and driven with a real browser (Edge via `playwright-core`, kept out of the repo), plus a dev-mode console pass. Sample catalogue in use (no TMDB key), so timings and byte counts are indicative.

## Fixed in Phase 1

| Area | Finding | Change |
| --- | --- | --- |
| Instructions (1.2) | Engineering rules had been moved out of `AGENTS.md` (now only the Next.js block); `CLAUDE.md` imported a roadmap path that did not exist | Rules merged into `AGENTS.md` (byte-identical to the former `AGENT.MD`); roadmap moved to `IMPLEMENTATION_ROADMAP.md`; `CLAUDE.md` rewritten as a short entry point |
| Images (1.9) | Default Next width buckets did not line up with TMDB sizes, so phones at 2× DPR fetched a 1280px backdrop where 780px suffices | `deviceSizes` / `imageSizes` aligned to TMDB widths. Desktop home 587 KB → 322 KB, desktop detail 420 KB → 210 KB at load |
| Images (1.9) | Dev LCP warning: first-row posters on `/movies`, `/tv`, `/trending` were lazy | First six grid posters load eagerly (`MovieGrid`) |
| Touch (1.8) | Wordmark 28px tall; "All" tab 17px wide; carousel dots 24px wide | Wordmark and tabs ≥ 44px; dots 32×44 (WCAG 2.5.8 needs 24) |
| A11y (1.10) | No skip link | Skip-to-content link, first tab stop, `#main-content` |
| A11y (1.10) | Search inputs suppressed the focus outline | Global 2px outline restored |
| A11y (1.10) | Card titles were `<h3>`, so grid pages jumped h1 → h3 | Card titles are `<p>`; heading order verified on 4 routes |
| A11y (1.10) | Carousel used `behavior: "smooth"` regardless of reduced-motion | Respects `prefers-reduced-motion` |
| Errors (1.5) | A failed search replaced the whole page, discarding the input | Failure handled inside results with a retry; input stays usable |
| Empty states (1.4) | Out-of-range `?page=` dead-ended | "Back to first page" link |
| SEO (1.6) | Empty overview produced an empty meta description; hard truncation mid-word; no OG type | `summarize()`; `og:type` `video.movie` / `video.tv_show`; canonical from the resolved title |
| Dead code (1.11) | Three needless exports | Un-exported; no dead files or duplicate components found |
| Sample data | Sample catalogue ignored `?page=`, hiding paging bugs | Returns an empty page past page 1 |

## Verified, no change needed

- No horizontal overflow: 14 routes × widths 320, 360, 375, 390, 430, 768, 1024, 1280, 1440.
- CLS 0.0000 on home, browse, search and detail at mobile and desktop.
- Dev mode: no hydration, key or runtime warnings on any route (remaining console output is the intended 404 pages).
- One `h1` per page; no skipped heading levels.
- Search: debounced, URL-driven, keeps focus while typing, syncs with back/forward and suggestion links, All / Movies / TV scopes, empty state.
- My List: add, remove, reload persistence, cross-tab sync, no false empty state before hydration (server HTML contains the skeleton).
- Metadata: title template, canonical, Open Graph image and type on movie and TV pages.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` clean.

## Deliberately not changed

- **Home rows do not catch TMDB errors.** The home page is statically generated and revalidated hourly. Catching errors there would bake an error state into the cached page; letting them throw keeps the last good page during ISR and fails the build if TMDB is down.
- **Detail-page poster stays lazy.** It is `display: none` on phones, so eager loading would download an image nobody sees. Dev mode may still note it as LCP on desktop.
- **Live-search result announcements.** Results are streamed in with the Suspense boundary, so a `role="status"` region would not be announced reliably. Revisit in the Phase 6 accessibility audit.

## Carried forward

| Item | Why it matters | Where |
| --- | --- | --- |
| Sample catalogue is used whenever no TMDB key is set, including production builds | A misconfigured deploy would silently serve demo data | Phase 6.3 (security/config review), Phase 7.1 |
| TMDB image CDN is loaded directly by browsers | Fine for now; revisit if a CSP is added | Phase 6.3 |
| Carousel dots are 32px wide, below the 44px comfort target | Meets WCAG 2.5.8 (24px); wider would crowd five dots on 320px | Phase 5.3 |

## Resolved after Phase 1

The design authority question is settled: **`DESIGN.md` ("Cognitive Deep-Blue Glass") is authoritative** and the product is named **Velora**. The app was restyled to that system (violet/Inter → cobalt-and-sky/Plus Jakarta Sans, glass chrome and panels, 8px controls and 16px cards), `docs/Design prompt.md` was rewritten to match, and "Verola" was corrected to "Velora" throughout. The Phase 1 measurements above pre-date the restyle; overflow, touch-target, layout-shift and interaction checks were re-run afterwards.

## Follow-up: fixes and release gate

A fresh-clone audit after the first Phase 1 commit found a blocker and several gaps. All are fixed except the one deliberate exception below.

| Finding | Resolution |
| --- | --- |
| `package-lock.json` out of sync (`npm ci` failed with EUSAGE off Windows) | Lockfile regenerated with `npm install --package-lock-only`; `npm ci` verified from a fresh clone |
| Cast row not keyboard-scrollable (axe: serious) | Labelled, focusable `role="region"`; verified with arrow keys at phone and desktop widths |
| 404 and error pages had no `<h1>`; a TMDB outage left the detail page with no `<title>` | `EmptyState` takes `as="h1"`; `generateMetadata` catches failures ("Title unavailable", noindex) and missing titles ("Title not found") |
| Search queries were forwarded to TMDB uncapped | Capped at 100 **code points** at the page, the input (`maxLength`) and the API layer |
| Hero text failed AA over very bright artwork on phones | Denser mobile scrim; worst case (pure white backdrop) is now 4.1:1 title / 6.8:1 overview at 320px. Desktop keeps the lighter fade |
| Footer had lost TMDB attribution | Exact notice from TMDB's API terms plus the official logo, unmodified and smaller than the Velora mark |
| Type checking failed on a fresh checkout without generated route types | `npm run typecheck` runs `next typegen` first |
| Stale `AGENTS.md` wording, duplicate `docs/MasterPrompt.md`, truncated roadmap, CRLF noise | Cleaned; `.gitattributes` added |

### Soft 404 (investigated, deliberately unchanged)

A detail URL TMDB does not know returns HTTP 200 with `noindex`, not 404. Root cause: `app/loading.tsx` and the detail route's `loading.tsx` stream the page shell before any layout or page runs, so the status is committed before `notFound()` can execute. A layout-level check was tried and had no effect. The only ways to get a 404 status are to remove the skeletons, to await TMDB before the first byte, or to reject URLs in a proxy on every request. None is worth it for this case, so the response stays a streamed 200 with `noindex` and a stable "Title not found" title. Unknown routes (`/nope`) still return a genuine 404.

### Release gate results

Run from a fresh clone of the final commit, with no `.env.local` (sample-data mode, as CI would be):

| Step | Result |
| --- | --- |
| `npm ci` | passes (361 packages) |
| `npm run lint` | passes |
| `npm run typecheck` (no prior build) | passes |
| `npm run build` | passes |
| axe-core, WCAG 2.0/2.1/2.2 A+AA + best practice, 13 routes × 2 viewports | 0 violations |
| Hero and detail text contrast incl. worst-case white backdrop, 320 / 390 / 1440px | all pass |
| Metadata, skip link, heading order, focus, eager images | 17/17 |
| Live search, URL state, clear, empty state, carousel, My List | 14/14 |
| Horizontal overflow, 14 routes × 9 widths; layout shift; cross-tab My List | 0 overflow; CLS 0.0000; pass |
| Error page, missing title, inline search failure, 16-person cast, search cap as TMDB receives it (fake API) | all pass, axe clean |
| Real TMDB API (working tree with a real key): lists, search, oversized and emoji queries, trailer, cast, images, keyboard, axe on 22 page/viewport combinations | all pass |

Not covered: real phones, browsers other than Chromium/Edge, screen-reader testing, and performance measurement (Lighthouse).

### Follow-ups for later phases

* **My List caches TMDB metadata in localStorage with no expiry.** TMDB's terms cap caching of their content at six months. Phase 2 stores identifiers server-side; until then consider a timestamp and refresh.
* **ESLint 9.39 is flagged as unsupported** by npm at install time. Plan the upgrade with the Phase 6 tooling work.
* **The sample catalogue is used whenever no TMDB key is set, including in production** (Phase 6.3 / 7.1).
