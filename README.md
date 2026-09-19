# Velora

Movie and TV discovery — Next.js (App Router), TypeScript, Tailwind CSS v4.

Project documents: [`AGENTS.md`](AGENTS.md) (engineering rules) · [`DESIGN.md`](DESIGN.md) (visual system) · [`docs/Design prompt.md`](docs/Design%20prompt.md) (product/UX brief) · [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) (phases) · [`docs/PHASE1_AUDIT.md`](docs/PHASE1_AUDIT.md) (Phase 1 findings).

## Run

```bash
npm install
cp .env.example .env.local   # then add TMDB credentials
npm run dev
```

Set `TMDB_ACCESS_TOKEN` (v4 read-access token) or `TMDB_API_KEY` (v3 key) in `.env.local`. Both are server-only. **Without either, Velora serves a small built-in sample catalogue** (`lib/tmdb/sample.ts`) so every screen is browsable without the API.

## Layout

| Path | Purpose |
| --- | --- |
| `app/` | Routes: `/`, `/movies`, `/tv`, `/trending`, `/search`, `/my-list`, `/[movie\|tv]/[id]` |
| `components/` | Shared UI. `MovieCard` is the single poster card; `MovieListItem` is its row form |
| `lib/tmdb/` | Server-only TMDB access (`client.ts`), mapping to domain types (`media.ts`), image loader |
| `lib/watchlist.ts` | My List store (localStorage for now; swap for Supabase without touching components) |
| `types/media.ts` | Domain types shared by server and client |
| `app/globals.css` | Semantic design tokens (`background`, `surface`, `accent`, …) |

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`

Release gate, from a fresh clone: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run build`.

Attribution: this product uses TMDB and the TMDB APIs. The footer carries TMDB's required notice and logo; keep both when changing the footer.
