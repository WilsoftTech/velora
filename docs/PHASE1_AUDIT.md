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
| `IMPLEMENTATION_ROADMAP.md` ends mid-word at "# 8. Archite" | Source document is truncated | Author to complete |

## Resolved after Phase 1

The design authority question is settled: **`DESIGN.md` ("Cognitive Deep-Blue Glass") is authoritative** and the product is named **Velora**. The app was restyled to that system (violet/Inter → cobalt-and-sky/Plus Jakarta Sans, glass chrome and panels, 8px controls and 16px cards), `docs/Design prompt.md` was rewritten to match, and "Verola" was corrected to "Velora" throughout. The Phase 1 measurements above pre-date the restyle; overflow, touch-target, layout-shift and interaction checks were re-run afterwards.
