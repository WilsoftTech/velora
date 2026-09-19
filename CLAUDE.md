# Velora

Movie and TV discovery app (Next.js App Router, TypeScript, Tailwind, TMDB). Read these before working here:

@AGENTS.md
@IMPLEMENTATION_ROADMAP.md

- `AGENTS.md` — engineering rules; always apply.
- `IMPLEMENTATION_ROADMAP.md` — what to build and in what order; finish a phase before starting the next.
- `DESIGN.md` — the visual system ("Cognitive Deep-Blue Glass"); authoritative for colour, type, spacing, radii and elevation. Read it before any UI work.
- `docs/Design prompt.md` — product and UX brief (screens, behaviour, structure) that applies `DESIGN.md` to a movie and TV product. If it disagrees with `DESIGN.md`, `DESIGN.md` wins.

Design tokens are implemented in `app/globals.css`; components use the semantic token names, never raw colours. The product name is **Velora**.
