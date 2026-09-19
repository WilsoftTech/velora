# VEROLA — Modern Movie Discovery Platform

You are a senior product designer, UI/UX designer, and frontend design engineer.

Your task is to design and implement the visual experience for **VEROLA**, a modern movie and TV discovery platform.

VEROLA should feel like a polished global consumer product — cinematic, sophisticated, fast, minimal, and highly usable — rather than a tutorial project or a direct clone of an existing streaming service.

The product is currently a responsive web application but is intentionally being designed so its experience can later translate naturally into an **Expo / React Native mobile application**.

---

# 1. Product Vision

VEROLA helps users:

* Discover movies and TV shows
* Browse trending and popular content
* Search quickly
* Explore movie/show details
* Discover cast and related content
* Watch trailers
* Save titles to personal watchlists
* Mark favourites
* Receive recommendations
* Maintain a personal entertainment profile

The experience should prioritize **discovery**.

Users should be able to open VEROLA and immediately find something interesting.

The interface should feel:

**Cinematic + Premium + Minimal + Fast + Personal**

Do not make it visually noisy.

Do not overload screens with unnecessary UI.

Content — especially posters, backdrops, titles, and imagery — should remain the visual focus.

---

# 2. Before Designing or Coding

FIRST inspect the existing repository.

Before creating anything:

1. Read `AGENTS.md`.
2. Inspect the current project structure.
3. Identify existing:

   * components
   * layouts
   * navigation
   * typography
   * colors
   * utilities
   * cards
   * buttons
   * loaders
   * search UI
   * movie sections
   * design tokens
4. Reuse existing components wherever practical.
5. Extend or compose existing components before creating new ones.

Follow this priority:

```text
REUSE
  ↓
COMPOSE
  ↓
EXTEND
  ↓
CREATE
```

Do NOT recreate an existing component just to achieve a slightly different visual treatment.

Do NOT create:

```text
MovieCard.tsx
MovieCard2.tsx
ModernMovieCard.tsx
TrendingMovieCard.tsx
PopularMovieCard.tsx
```

when one well-designed reusable component can support the required use cases.

Do not perform unrelated rewrites.

---

# 3. Brand

Product name:

# VEROLA

The VEROLA brand should feel distinctive enough to become a standalone entertainment technology brand.

Avoid copying Netflix, Disney+, Prime Video, Apple TV+, IMDb, Letterboxd, or TMDB.

They may inform general UX conventions, but VEROLA must have its own visual identity.

The wordmark should feel:

* Modern
* Clean
* Premium
* Recognizable
* Simple enough for mobile

Avoid overly decorative branding.

---

# 4. Visual Direction

Design VEROLA as a premium cinematic product.

Use:

* Strong movie imagery
* Generous whitespace
* Clear hierarchy
* Clean typography
* Restrained borders
* Soft visual layering
* Carefully controlled gradients
* Subtle depth
* High-quality poster presentation
* Elegant transitions
* Consistent spacing

Avoid:

* Excessive glassmorphism
* Excessive gradients
* Neon overload
* Heavy borders
* Huge shadows
* Too many rounded containers
* Excessive badges
* Dashboard-style boxes everywhere
* Visual clutter
* Over-animation
* Generic AI-generated SaaS aesthetics

This is an entertainment experience, not an analytics dashboard.

---

# 5. Theme

Start with a premium **dark cinematic theme**.

Dark mode should be the primary initial experience because movie artwork and trailers benefit from a darker environment.

However, structure the design tokens so a future light theme remains possible.

Do NOT hard-code colors throughout components.

Use semantic design tokens such as:

```text
background
surface
surface-elevated
foreground
muted
border
accent
accent-foreground
destructive
```

Keep the palette restrained.

Use one recognizable VEROLA accent color rather than many competing accent colors.

The accent should be used intentionally for:

* Primary actions
* Active navigation
* Focus states
* Important highlights

Do not apply the accent to everything.

---

# 6. Typography

Typography should feel contemporary and editorial.

Prioritize:

* Readability
* Strong movie titles
* Clear section headings
* Compact metadata
* Excellent mobile readability

Create obvious hierarchy between:

```text
Hero title
Page title
Section title
Movie title
Metadata
Body copy
Supporting labels
```

Avoid excessive font weights and font sizes.

Do not introduce multiple font families without a strong reason.

Typography should remain lightweight and performant.

---

# 7. Mobile-First Requirement

Design MOBILE FIRST.

The application must feel intentionally designed for phones rather than like a desktop website compressed onto a smaller screen.

Start design decisions around approximately:

```text
320px
360px
375px
390px
430px
```

Then progressively enhance for:

```text
tablet
laptop
desktop
large desktop
```

No horizontal overflow should occur accidentally.

Touch targets must be comfortable.

Important actions must never depend on hover.

---

# 8. Responsive Philosophy

Do not simply shrink desktop components.

Components should adapt.

For example:

Desktop navigation may use:

```text
VEROLA    Home    Movies    TV Shows    Discover           Search    Profile
```

while mobile can use a compact top bar plus bottom navigation:

```text
┌───────────────────────────┐
│ VEROLA               🔍   │
│                           │
│        Content            │
│                           │
├───────────────────────────┤
│  Home  Discover  Saved  Me│
└───────────────────────────┘
```

Treat these as conceptual directions, not rigid layouts.

Choose the best information architecture based on the existing application.

---

# 9. Homepage

The homepage should immediately communicate that VEROLA is a movie discovery platform.

Consider this hierarchy:

```text
Navigation
     ↓
Cinematic Hero
     ↓
Trending
     ↓
Popular Movies
     ↓
Popular TV
     ↓
Top Rated
     ↓
Genre/Discovery sections
     ↓
Additional personalized sections later
```

Do not display every possible section simply because data exists.

Prioritize useful discovery.

---

# 10. Hero

The hero is the emotional anchor of the homepage.

Use a high-quality cinematic backdrop.

The hero may include:

* Movie/show title
* Short overview
* Release year
* Rating
* Genre
* Primary CTA
* Secondary action

Example conceptual hierarchy:

```text
                     cinematic backdrop

VEROLA FEATURED

DUNE: PART TWO

2024   ★ 8.3   Sci-Fi · Adventure

Paul Atreides unites with Chani and the Fremen
while seeking revenge against those who destroyed
his family.

[ View Details ]    [+ Watchlist]
```

Do not overload the hero with metadata.

Use gradients carefully to maintain text readability over artwork.

The hero should scale gracefully on mobile.

On mobile:

* Keep text concise
* Keep CTAs touch-friendly
* Prevent the hero from consuming an unreasonable amount of vertical space
* Preserve important focal areas of the backdrop

---

# 11. Movie Cards

Movie posters are among the most important reusable visual components.

Design one flexible `MovieCard` system rather than separate cards for every section.

A card may support:

* Poster
* Title
* Release year
* Rating
* Optional status/action

Keep metadata restrained.

Do not place large containers around posters unnecessarily.

Poster artwork should remain dominant.

Maintain correct movie poster aspect ratios.

Cards should support:

```text
Mobile
2 columns where appropriate

Tablet
3–4 columns

Desktop
5–6+ columns depending on available width
```

For horizontally scrollable discovery rows, ensure touch scrolling feels natural.

Desktop hover behavior may reveal additional information, but the same information/action must remain accessible without hover.

---

# 12. Section Design

Sections such as:

```text
Trending Now
Popular Movies
Popular TV Shows
Top Rated
Because You Watched...
```

should use a consistent reusable section structure.

Example:

```text
Trending Now                              View all →

[poster] [poster] [poster] [poster] [poster] [poster]
```

Section headings should be easy to scan without competing with movie artwork.

---

# 13. Search Experience

Search is a primary product feature.

It should feel exceptionally fast.

Support:

* Search icon/action
* Clear search input
* Debounced results
* Loading state
* Empty state
* Error state
* Recent searches later
* Trending searches later

On mobile, consider a dedicated search experience rather than squeezing a large input into the navigation.

Example:

```text
Search VEROLA
┌─────────────────────────────┐
│ 🔍 Search movies & shows... │
└─────────────────────────────┘

Trending searches

Dune
The Last of Us
Oppenheimer
Interstellar
```

Do not make search visually complicated.

---

# 14. Movie Detail Page

The movie detail page should feel cinematic and editorial.

Consider:

```text
Backdrop
    ↓
Poster + Core information
    ↓
Title
Metadata
Genres
Rating
Overview
Actions
    ↓
Trailer
    ↓
Cast
    ↓
Related / Similar Movies
```

Desktop can use poster + content side-by-side.

Mobile should reorganize naturally into a vertical layout.

Primary actions may include:

```text
Watch Trailer
Add to Watchlist
Favourite
```

Avoid excessive metadata above the fold.

Prioritize information users actually use when deciding whether a movie interests them.

---

# 15. Cast

Cast should be visual but lightweight.

Use reusable person cards.

Show only useful information initially:

```text
Photo
Actor name
Character
```

Do not make cast cards compete visually with movie cards.

---

# 16. Watchlist

The watchlist should feel personal and clean.

Support:

* Saved movies/shows
* Easy removal
* Empty state
* Potential filtering later

Empty states should feel intentional.

Example concept:

```text
Your watchlist is empty.

Save movies and shows you want to discover later.

[ Explore Movies ]
```

---

# 17. Navigation

Navigation should remain simple.

Avoid too many top-level destinations.

Potential structure:

```text
Home
Movies
TV Shows
Discover
Watchlist
```

Search should remain prominent.

User/profile functionality should be accessible without dominating navigation.

On mobile, prioritize the destinations users need most frequently.

---

# 18. Loading States

Use skeletons that approximate actual content geometry.

For example:

```text
████████
████████
████████
████████
████████
████████
────────
██████
```

for a poster card.

Reuse existing skeleton components.

Avoid loading spinners everywhere.

Skeletons should not cause large layout shifts when real content arrives.

---

# 19. Empty States

Design intentional empty states for:

* Search with no results
* Empty watchlist
* Empty favourites
* Missing recommendations
* Failed content loading where appropriate

Keep copy concise and useful.

---

# 20. Error States

Errors should be understandable and recoverable.

Where appropriate provide:

```text
Something went wrong.

[ Try Again ]
```

Do not expose technical errors to end users.

---

# 21. Performance

VEROLA must remain lightweight.

Visual sophistication must NOT come at the cost of excessive JavaScript.

Prefer:

```text
CSS
Tailwind
native browser behavior
Server Components
```

over heavy frontend libraries.

Do not add an animation library unless existing CSS/Tailwind capabilities genuinely cannot satisfy the requirement.

Do not install large packages merely for visual polish.

Before adding ANY dependency, verify that:

1. The functionality does not already exist.
2. Existing dependencies cannot solve it.
3. CSS/browser APIs cannot reasonably solve it.
4. The dependency provides enough value to justify its weight.

---

# 22. Images and Performance

VEROLA is image-heavy.

Treat image performance as a core design requirement.

Use appropriately sized TMDB images.

Do not request full-resolution images for small cards.

Use:

* Responsive image sizing
* Correct aspect ratios
* Lazy loading
* Appropriate priority for above-the-fold imagery
* Graceful image fallbacks
* Layout-stable containers

Avoid unnecessary image downloads.

---

# 23. Motion

Motion should feel polished but almost invisible.

Good uses:

* Card transitions
* Button feedback
* Menu transitions
* Sheet/dialog transitions
* Image loading
* Navigation feedback

Prefer short CSS transitions.

Avoid:

* Large page animations
* Constant moving backgrounds
* Excessive parallax
* Animation on every element

Respect reduced-motion preferences.

---

# 24. Accessibility

The visual design must not sacrifice accessibility.

Ensure:

* Strong contrast
* Visible focus states
* Keyboard navigation
* Semantic HTML
* Proper labels
* Appropriate alt text
* Accessible dialogs
* Accessible navigation
* Touch-friendly controls

Never rely solely on color to communicate state.

---

# 25. Design System

Establish a small coherent design system.

Define:

### Color

Semantic color tokens.

### Typography

A small hierarchy.

### Spacing

Use a consistent spacing scale.

### Radius

Use a restrained radius system.

Do not make every element excessively rounded.

### Elevation

Use minimal elevation.

### Interaction states

Define:

```text
default
hover
focus
active
disabled
loading
```

The system should remain simple enough for future React Native implementation.

---

# 26. Component Reuse

Before creating a component, search the project.

Preferred reusable primitives include concepts such as:

```text
MovieCard
PersonCard
MediaGrid
MediaRow
SectionHeader
Rating
GenreBadge
SearchInput
EmptyState
PosterImage
BackdropImage
```

These are conceptual examples.

Do NOT create them automatically if equivalent components already exist.

Do NOT abstract trivial markup merely to satisfy this list.

Reuse first.

---

# 27. shadcn/ui

Use existing shadcn/ui components where they provide useful accessible primitives.

Potential examples:

* Dialog
* Sheet
* Dropdown Menu
* Tooltip
* Tabs
* Button
* Input
* Skeleton

Do not turn VEROLA into a generic shadcn dashboard.

shadcn should provide underlying primitives.

VEROLA's visual identity should come from our design system and content.

---

# 28. Client JavaScript

Keep client-side JavaScript minimal.

Do not turn entire pages into Client Components merely for one interaction.

Prefer:

```text
Server-rendered page
       │
       ├── static/server content
       ├── movie grids
       └── small interactive islands
```

Keep `"use client"` boundaries narrow.

---

# 29. Mobile App Future

Remember that VEROLA is expected to eventually have:

```text
Expo + React Native
```

Do not design interactions that only make sense with a mouse.

Concepts should translate naturally to:

* Touch
* Native navigation
* Bottom tabs
* Mobile sheets
* Native gestures

Web and mobile do NOT need to share identical UI code.

They should share the same product language and design system concepts.

---

# 30. Avoid Generic Design

Do not produce a generic movie tutorial interface.

Avoid the predictable combination of:

```text
black background
red buttons
Netflix-like navigation
identical horizontal carousels everywhere
```

VEROLA needs its own identity.

Use thoughtful:

* Typography
* Spacing
* Composition
* Artwork presentation
* Navigation
* Accent treatment

to create differentiation without introducing visual complexity.

---

# 31. Design Quality Test

For every screen ask:

### Hierarchy

What should the user notice first?

### Purpose

What is the primary action?

### Clutter

Can anything be removed?

### Reuse

Does an existing component already solve this?

### Mobile

Does this feel intentionally designed at 375px?

### Touch

Can every interaction work without hover?

### Performance

Is visual polish adding unnecessary JavaScript or image weight?

### Accessibility

Can keyboard and assistive-technology users operate it?

### Consistency

Does this feel like the same VEROLA product?

---

# 32. Implementation Process

Do NOT redesign the entire application blindly.

Follow this process:

### Step 1 — Audit

Inspect the existing application and identify:

* Existing design
* Existing components
* Duplicate patterns
* Responsive problems
* Accessibility issues
* Visual inconsistencies
* Opportunities for reuse

### Step 2 — Establish Design Direction

Define the VEROLA visual language:

* Colors
* Typography
* Spacing
* Radius
* Surfaces
* Navigation behavior
* Card behavior
* Responsive principles

Do not create a massive design system.

### Step 3 — Homepage

Implement/refine:

* Navigation
* Hero
* Core discovery sections
* Movie cards
* Responsive behavior

Reuse existing functionality.

### Step 4 — Search

Create/refine the responsive search experience.

### Step 5 — Detail Page

Create/refine the cinematic movie/show detail experience.

### Step 6 — Personal Features

Apply the same design language to:

* Watchlist
* Favourites
* Authentication/profile

only when those features exist or are requested.

---

# 33. Critical Constraints

DO NOT:

* Rewrite working components unnecessarily.
* Duplicate existing components.
* Install unnecessary packages.
* Introduce heavy animation libraries.
* Introduce a second UI framework.
* Convert entire pages to Client Components unnecessarily.
* Sacrifice performance for visual effects.
* Hard-code the same design values repeatedly.
* Break existing application functionality.
* Change backend/business logic merely for visual redesign unless required.
* Over-engineer the design system.
* Copy another entertainment platform.

DO:

* Inspect first.
* Reuse first.
* Make small coherent changes.
* Keep the app lightweight.
* Design mobile-first.
* Maintain accessibility.
* Optimize imagery.
* Preserve type safety.
* Preserve existing functionality.
* Keep the design consistent.

---

# 34. Desired Result

The final VEROLA experience should feel like a product that could credibly ship globally.

When someone opens VEROLA, the impression should be:

> "This feels like a real entertainment product."

Not:

> "This looks like a movie API coding project."

The experience should be visually premium without being heavy.

The strongest elements should be:

**movie artwork + typography + spacing + hierarchy + interaction quality**

rather than excessive effects.

Build a distinctive, responsive, cinematic experience while keeping the implementation simple, reusable, performant, and ready for VEROLA's eventual transition into a native mobile application.
