# VELORA — Implementation Roadmap

> Production roadmap for the Velora movie and TV discovery platform.

---

## 1. Purpose

This document defines the implementation roadmap for **Velora** from its current state to a production-ready application.

Development is divided into **7 phases**.

Each phase must:

1. Build on the existing application.
2. Reuse existing components and infrastructure.
3. Remain lightweight.
4. Preserve working functionality.
5. Be completed and verified before the next phase begins.

This roadmap defines **what we build and in what order**.

Engineering rules are defined in:

```text
AGENTS.md
```

Design direction is defined in:

```text
DESIGN.md
```

Agents working on this repository must read those documents before implementing roadmap items.

---

# 2. Core Development Principle

Velora must evolve incrementally.

Do not rebuild the application between phases.

Follow:

```text
REUSE
  ↓
COMPOSE
  ↓
EXTEND
  ↓
CREATE
```

Before implementing any roadmap item:

* Inspect the existing repository.
* Search for existing components.
* Search for existing utilities.
* Search for existing types.
* Search for existing data-fetching functions.
* Search for existing UI patterns.
* Determine the smallest coherent change.

Do not create parallel implementations of functionality that already exists.

---

# 3. Product Goal

Velora will become a production-grade movie and TV discovery platform supporting:

* Movie discovery
* TV discovery
* Search
* Movie and TV details
* Cast information
* Trailers
* Related content
* Accounts
* Profiles
* Watchlists
* Personalization
* Search analytics
* Recommendations
* Progressive Web App installation
* Future Expo / React Native applications

The product must remain:

* Fast
* Lightweight
* Responsive
* Mobile-first
* Accessible
* SEO-friendly
* Maintainable
* Secure
* Production-ready

---

# 4. Technology Direction

Current core:

```text
Next.js
React
TypeScript
Tailwind CSS
TMDB
Lucide
```

Planned infrastructure should be introduced only when the corresponding phase requires it.

Potential additions:

```text
Supabase
PostgreSQL
Playwright
Vitest
Sentry
PostHog
Vercel
Expo / React Native
```

Do NOT install future dependencies prematurely.

Every dependency must solve an existing problem.

---

# 5. Phase Overview

| Phase | Focus                        | Milestone                    |
| ----- | ---------------------------- | ---------------------------- |
| 1     | Foundation & Discovery       | Stable discovery application |
| 2     | Accounts & Persistent Data   | Multi-user application       |
| 3     | Discovery Intelligence       | Advanced discovery platform  |
| 4     | Personalization & Engagement | Personalized product         |
| 5     | PWA & Mobile Readiness       | Installable mobile-ready app |
| 6     | Production Engineering       | Release candidate            |
| 7     | Launch & Growth              | Production v1.0              |

---

# PHASE 1 — FOUNDATION & DISCOVERY

## Objective

Complete and stabilize the existing Velora discovery experience before introducing accounts or database infrastructure.

Much of this phase already exists.

The purpose of this phase is therefore:

**audit → complete → polish → stabilize**

rather than rewrite.

---

## Existing Foundation

The repository already contains functionality including:

* Homepage
* Hero
* Trending content
* Popular movies
* Popular TV
* Top-rated content
* Movie browsing
* TV browsing
* Trending page
* Search
* Search scopes
* Movie/TV details
* Cast
* Trailers
* Similar titles
* My List
* Responsive navigation
* Mobile bottom navigation
* Loading states
* Error states
* Empty states
* TMDB abstraction
* Image abstraction
* Reusable media components
* SEO metadata

Preserve and improve these implementations.

Do not recreate them.

---

## 1.1 Repository Audit

Audit the existing project.

Check:

* Components
* Routes
* TMDB integration
* Type definitions
* Utilities
* Responsive behavior
* Accessibility
* Loading states
* Error states
* Image handling
* Metadata
* Dead code
* Duplicate code

Document significant problems before making broad changes.

---

## 1.2 Instruction Consolidation

Repository instructions should have clear ownership.

Target:

```text
AGENTS.md
DESIGN.md
IMPLEMENTATION_ROADMAP.md
CLAUDE.md
```

Responsibilities:

### AGENTS.md

Engineering rules.

### DESIGN.md

Visual and UX direction.

### IMPLEMENTATION_ROADMAP.md

Product implementation sequence.

### CLAUDE.md

Small entry point instructing Claude Code to read the documents above.

Avoid multiple competing design or agent instruction files.

---

## 1.3 Homepage

Verify and polish:

* Hero
* Trending section
* Popular movies
* Popular TV
* Top rated
* Section navigation
* Loading states
* Responsive layout

Preserve independent Suspense streaming.

Do not combine everything into a large Client Component.

---

## 1.4 Browse Pages

Verify:

```text
/movies
/tv
/trending
```

Ensure:

* Consistent layouts
* Pagination where required
* Correct empty states
* Correct error states
* Mobile responsiveness
* Reusable media grids
* URL-based filters where applicable

---

## 1.5 Search

Complete the search experience.

Verify:

* Debouncing
* URL-based query state
* Movie filter
* TV filter
* All filter
* Loading state
* Empty state
* Error handling
* Mobile keyboard behavior
* Accessible search controls

Do not introduce a client-side data library unless required.

---

## 1.6 Detail Pages

Verify:

```text
/movie/[id]
/tv/[id]
```

or the existing equivalent dynamic route.

Ensure detail pages include:

* Backdrop
* Poster
* Title
* Release information
* Rating
* Runtime/seasons
* Genres
* Overview
* Trailer
* Cast
* Similar content
* Watchlist action
* Metadata
* Open Graph metadata
* Canonical URL

Reuse existing components.

---

## 1.7 My List — Guest Version

Keep the existing guest watchlist implementation operational.

At this stage:

```text
localStorage
```

is acceptable.

Do not introduce database synchronization until Phase 2.

Ensure:

* Add works
* Remove works
* Refresh persistence works
* Empty state works
* Cross-tab behavior works where supported
* Hydration behavior is correct

---

## 1.8 Responsive Audit

Test at approximately:

```text
320px
360px
375px
390px
430px
768px
1024px
1280px
1440px+
```

Check:

* Navigation
* Hero
* Cards
* Grids
* Search
* Detail pages
* Cast
* Trailer
* My List
* Bottom navigation
* Touch targets

No essential feature may depend on hover.

---

## 1.9 Image Performance

Audit TMDB imagery.

Verify:

* Appropriate image sizes
* Correct aspect ratios
* Responsive `sizes`
* Lazy loading
* Priority/preload only where justified
* Image fallbacks
* Minimal layout shift

Do not download unnecessarily large TMDB images for small cards.

---

## 1.10 Accessibility

Audit:

* Semantic HTML
* Heading hierarchy
* Keyboard navigation
* Focus indicators
* Image alt text
* Search labels
* Buttons
* Links
* Dialogs if present
* Contrast
* Reduced motion

---

## 1.11 Code Quality

Before completing Phase 1:

```bash
npm run lint
npm run build
```

must succeed.

Resolve:

* TypeScript errors
* ESLint errors
* Broken routes
* Obvious console errors
* Duplicate components
* Dead imports
* Dead code where confidently removable

---

## Phase 1 Exit Criteria

Phase 1 is complete when:

* Core discovery flows work.
* Search works.
* Detail pages work.
* Guest My List works.
* Mobile layouts work.
* Desktop layouts work.
* Images are optimized.
* Accessibility baseline is acceptable.
* No obvious duplicate components remain.
* Build succeeds.
* Lint succeeds.
* No unnecessary dependency has been introduced.

Milestone:

```text
v0.1 — Foundation
```

---

# PHASE 2 — ACCOUNTS & PERSISTENT DATA

## Objective

Transform Velora from an anonymous discovery frontend into a persistent multi-user application.

Introduce:

```text
Supabase
PostgreSQL
Supabase Auth
```

Keep infrastructure minimal.

---

## 2.1 Supabase Foundation

Configure:

* Supabase project
* Environment variables
* Browser client where required
* Server client
* Session handling
* Database migrations/schema
* Generated or maintained database types

Never expose service-role credentials to the browser.

---

## 2.2 Authentication

Implement:

* Sign up
* Sign in
* Sign out
* Session persistence
* Protected account functionality
* Auth loading/error states

Choose the simplest appropriate authentication methods initially.

Do not build a complex identity system.

---

## 2.3 Profiles

Create a minimal profile model.

Potential fields:

```text
id
display_name
avatar_url
created_at
updated_at
```

Do not collect unnecessary personal information.

---

## 2.4 Persistent Watchlists

Create persistent user watchlists.

Initial schema can remain lightweight.

Example:

```text
watchlist_items

id
user_id
tmdb_id
media_type
created_at
```

Enforce uniqueness for:

```text
user_id + tmdb_id + media_type
```

Do not duplicate the complete TMDB catalogue in PostgreSQL.

TMDB remains the source of truth for media metadata unless a later requirement justifies caching selected metadata.

---

## 2.5 Row Level Security

Enable Supabase RLS.

Users must only be able to:

* Read their own private watchlist data
* Create their own watchlist entries
* Delete their own watchlist entries
* Modify their own profile where permitted

Never rely solely on frontend authorization.

---

## 2.6 Preserve Existing Components

Do NOT rewrite:

```text
MovieCard
MovieListItem
MovieSection
WatchlistButton
My List presentation
```

merely because persistence changes.

Replace or extend the underlying data layer.

Desired architecture:

```text
UI
 ↓
watchlist interface
 ↓
guest → localStorage
authenticated → Supabase
```

---

## 2.7 Guest Watchlist Migration

Anonymous users may build a local watchlist.

When they authenticate:

```text
localStorage watchlist
        ↓
authenticate
        ↓
merge with server watchlist
        ↓
deduplicate
        ↓
persist to Supabase
        ↓
clean migrated local state
```

Migration must be safe and idempotent.

---

## 2.8 Account UX

Add only necessary account UI:

* Sign in
* Sign up
* Profile/account
* Sign out
* My List

Keep authentication screens lightweight.

---

## Phase 2 Exit Criteria

* Users can register.
* Users can sign in.
* Sessions persist.
* Users can sign out.
* Watchlists persist across devices.
* Guest watchlists can migrate.
* RLS protects user data.
* Existing media components remain reused.
* Build and lint pass.
* Authentication flows work on mobile and desktop.

Milestone:

```text
v0.2 — Accounts
```

---

# PHASE 3 — DISCOVERY INTELLIGENCE

## Objective

Make Velora substantially better at helping users find content.

---

## 3.1 Discover Experience

Introduce a dedicated discovery experience.

Potential filters:

* Genre
* Movie/TV
* Release year
* Rating
* Popularity
* Language where useful

Keep filters URL-driven where practical.

Example:

```text
/discover?type=movie&genre=28&year=2026
```

This makes states:

* Shareable
* Bookmarkable
* SEO-compatible where appropriate
* Easier to debug

---

## 3.2 Genre Discovery

Users should be able to browse titles by genre.

Reuse existing:

```text
MovieCard
MovieGrid
BrowsePage
```

or their current equivalents.

Do not create genre-specific card systems.

---

## 3.3 Search History

For authenticated users, optionally persist recent searches.

Provide:

* Recent queries
* Remove query
* Clear history

Do not store unnecessary search data.

---

## 3.4 Search Analytics

Introduce anonymous/product-level search event tracking.

Potential model:

```text
search_events

id
user_id nullable
query
result_count
created_at
```

Consider privacy and data minimization.

---

## 3.5 Real Trending Searches

Replace the current conceptual TMDB-based trending-search suggestions with actual Velora search trends.

Calculate trends from Velora search activity.

The UI should continue to reuse the existing search experience.

---

## 3.6 Recently Viewed

Optionally track recently viewed titles.

Potential uses:

```text
Continue exploring
Recently viewed
Return to title
```

Keep storage and retention proportional to the feature.

---

## 3.7 Recommendations

Start simple.

Use signals such as:

* Genres
* Saved titles
* Similar-title data
* Recent interactions
* TMDB recommendations

Do NOT introduce custom machine-learning infrastructure yet.

---

## Phase 3 Exit Criteria

* Discover page works.
* Genre browsing works.
* Filters work.
* Search analytics exist.
* Trending searches represent Velora activity.
* Recently viewed works if implemented.
* Basic recommendations work.
* Existing media components are reused.
* Performance remains acceptable.

Milestone:

```text
v0.3 — Discovery
```

---

# PHASE 4 — PERSONALIZATION & ENGAGEMENT

## Objective

Make Velora useful as a persistent personal entertainment product.

---

## 4.1 Personalized Homepage

Authenticated users may receive sections such as:

```text
Recommended for You
Because You Saved...
Recently Viewed
Your Genres
Popular This Week
```

Do not overwhelm the homepage.

Prioritize useful sections.

---

## 4.2 Favourites

Only introduce favourites if product behavior clearly differs from watchlists.

Potential distinction:

```text
Watchlist
→ things I want to watch

Favourite
→ things I already love
```

Do not add duplicate concepts without meaningful UX differences.

---

## 4.3 Ratings

If user ratings are introduced:

* Keep the interaction simple.
* Store ratings per user/title.
* Allow editing/removal.
* Keep TMDB ratings visually distinct from Velora user ratings.

---

## 4.4 Profile

Expand profile functionality only as needed.

Potential information:

* Display name
* Avatar
* Joined date
* Saved count
* Favourite genres

Avoid turning profiles into social networks prematurely.

---

## 4.5 Settings

Potential settings:

* Theme when light mode exists
* Content preferences
* Language
* Privacy preferences
* Account management

Only implement settings backed by real behavior.

---

## 4.6 Recommendation Signals

Improve recommendations using available first-party signals.

Possible signals:

```text
watchlist
favourites
ratings
genres
searches
recently viewed
```

Keep algorithms understandable initially.

---

## Phase 4 Exit Criteria

* Homepage can personalize appropriately.
* User preferences persist.
* Profile experience is complete.
* Personalization works across sessions.
* Recommendation logic remains maintainable.
* No unnecessary social features exist.
* Performance remains acceptable.

Milestone:

```text
v0.4 — Personalization
```

---

# PHASE 5 — PWA & MOBILE READINESS

## Objective

Make Velora feel like an application on mobile devices and prepare the architecture for future native apps.

---

## 5.1 Web App Manifest

Implement:

* App name
* Short name
* Description
* Icons
* Theme colors
* Start URL
* Display behavior

Users should be able to install Velora where supported.

---

## 5.2 App Icons

Create production-quality Velora icons for required sizes.

Maintain consistent branding.

---

## 5.3 Mobile Navigation Audit

Verify:

* Bottom navigation
* Search
* Account access
* My List
* Safe-area behavior
* Keyboard behavior
* Touch targets

---

## 5.4 PWA Caching

Use caching carefully.

Good candidates:

* Static assets
* App shell resources
* Selected non-sensitive resources

Be conservative with dynamic TMDB data.

Avoid complicated offline synchronization unless there is a concrete product requirement.

---

## 5.5 Offline Experience

Provide a graceful offline state.

Do not attempt to make every Velora feature fully offline.

---

## 5.6 Mobile Architecture Preparation

Identify logic suitable for future sharing:

```text
types
schemas
API contracts
business logic
constants
utilities
```

Do not prematurely convert the repository into a monorepo unless native development is actually beginning.

---

## 5.7 Future Native Direction

Native target:

```text
Expo
React Native
TypeScript
```

When native development begins, potential structure:

```text
apps/
├── web/
└── mobile/

packages/
├── api/
├── types/
├── validation/
├── config/
└── utils/
```

Do not share UI merely for the sake of sharing code.

Share domain logic.

---

## Phase 5 Exit Criteria

* Velora is installable where PWA installation is supported.
* Manifest is valid.
* Icons work.
* Mobile navigation is polished.
* Offline failure is graceful.
* Touch interactions are reliable.
* Architecture is ready for a future Expo client.
* No unnecessary PWA complexity has been introduced.

Milestone:

```text
v0.5 — Mobile Ready
```

---

# PHASE 6 — PRODUCTION ENGINEERING

## Objective

Turn the feature-complete product into a dependable production release candidate.

---

## 6.1 Testing Infrastructure

Introduce testing deliberately.

Potential stack:

```text
Vitest
React Testing Library
Playwright
```

Do not chase meaningless coverage percentages.

Prioritize behavior and critical journeys.

---

## 6.2 End-to-End Testing

Critical flows should include:

### Discovery

```text
Homepage
→ browse
→ select title
→ detail page
```

### Search

```text
Search
→ results
→ filter
→ detail
```

### Authentication

```text
Sign up
→ session
→ sign out
→ sign in
```

### Watchlist

```text
Sign in
→ add title
→ My List
→ verify title
→ remove title
```

### Guest Migration

```text
guest
→ save title
→ authenticate
→ verify title migrated
```

---

## 6.3 Security Review

Audit:

* Environment variables
* Secrets
* Authentication
* Authorization
* RLS
* Input validation
* Redirects
* External URLs
* API usage
* Database permissions
* Error messages

Never expose internal credentials.

---

## 6.4 Rate Limiting

Add rate limiting only where abuse risk warrants it.

Potential candidates:

* Authentication-related endpoints
* Search/event collection
* Expensive server endpoints

Do not add infrastructure solely because rate limiting sounds production-ready.

---

## 6.5 Performance Audit

Measure:

* Core Web Vitals
* Initial JavaScript
* Image weight
* Fonts
* Server response times
* TMDB calls
* Database calls
* Hydration
* Client Components

Optimize measured bottlenecks.

---

## 6.6 Bundle Audit

Identify:

* Large dependencies
* Duplicate dependencies
* Unnecessary client libraries
* Components accidentally moved client-side

Remove unnecessary weight.

---

## 6.7 Monitoring

Introduce production error monitoring.

Preferred direction:

```text
Sentry
```

Track actionable errors.

Avoid collecting unnecessary user data.

---

## 6.8 CI

GitHub Actions should verify relevant checks.

Potential pipeline:

```text
install
   ↓
lint
   ↓
type check
   ↓
tests
   ↓
build
```

E2E strategy should remain practical for the project's deployment workflow.

---

## 6.9 Accessibility Audit

Perform a final accessibility pass.

Verify:

* Keyboard navigation
* Focus
* Contrast
* Screen-reader semantics
* Forms
* Error messages
* Modals
* Mobile navigation
* Reduced motion

---

## Phase 6 Exit Criteria

* Critical E2E flows pass.
* Unit/component tests cover important logic where useful.
* CI passes.
* Security review is complete.
* RLS is verified.
* Production errors can be monitored.
* Performance has been measured.
* Major performance issues are resolved.
* Accessibility has been audited.
* Production build succeeds.

Milestone:

```text
v0.9 — Release Candidate
```

---

# PHASE 7 — PRODUCTION LAUNCH & GROWTH

## Objective

Launch Velora as a production application with the operational infrastructure required to maintain and improve it.

---

## 7.1 Production Deployment

Primary web deployment:

```text
Vercel
```

Configure:

* Production environment
* Environment variables
* Domain
* HTTPS
* Deployment protections where appropriate

---

## 7.2 Environment Strategy

Maintain clear environments where useful:

```text
local
preview/staging
production
```

Production credentials must remain separate from development credentials where practical.

---

## 7.3 Domain

Configure the official Velora domain.

Ensure:

* HTTPS
* Canonical host
* Redirect behavior
* Metadata URLs
* Sitemap URLs
* Open Graph URLs

are correct.

---

## 7.4 SEO

Production SEO should include:

* Metadata
* Canonical URLs
* Sitemap
* robots.txt
* Open Graph
* Social images
* Semantic headings
* Indexable media pages where appropriate
* Structured data where it provides genuine value

Avoid SEO spam.

---

## 7.5 Product Analytics

Introduce product analytics when there is real usage to analyze.

Potential platform:

```text
PostHog
```

Track meaningful events such as:

```text
search
media_view
watchlist_add
watchlist_remove
signup
login
trailer_play
```

Do not track every click.

---

## 7.6 Privacy

Document:

* What information is collected
* Why it is collected
* How long it is retained
* Which external services process it

Provide appropriate:

* Privacy policy
* Cookie handling where applicable
* Account deletion process
* Data deletion process

Requirements should reflect jurisdictions in which Velora operates.

---

## 7.7 Database Operations

Establish:

* Migration process
* Backup strategy
* Recovery procedure
* RLS review process

Production database changes should be deliberate.

---

## 7.8 Monitoring

Monitor:

* Application errors
* Deployment failures
* Database failures
* Authentication issues
* API failures
* Performance regressions

Alerts should be actionable.

---

## 7.9 Analytics Review

After launch, use actual product data to determine what to build next.

Evaluate:

```text
What do users search for?
What do they save?
Where do they abandon flows?
Which discovery sections are useful?
How often do users return?
Which devices dominate usage?
```

Do not optimize based purely on assumptions.

---

## 7.10 Native Mobile Decision

Only after the responsive/PWA product has meaningful usage should native development become a major engineering priority.

At that point evaluate:

```text
Expo + React Native
```

using Velora's existing:

* Backend
* Authentication
* Database
* Types
* API contracts
* Business logic
* Product analytics

Do not rewrite the backend for mobile.

---

## Phase 7 Exit Criteria

* Production deployment is live.
* Domain works.
* HTTPS works.
* SEO infrastructure works.
* Monitoring works.
* Analytics works.
* Privacy requirements are addressed.
* Backup/recovery strategy exists.
* CI/CD is reliable.
* Production environment is documented.
* Critical user journeys work in production.

Milestone:

```text
v1.0 — Production
```

---

# 6. Version Roadmap

```text
v0.1
Foundation
    ↓
v0.2
Accounts
    ↓
v0.3
Discovery
    ↓
v0.4
Personalization
    ↓
v0.5
PWA / Mobile Ready
    ↓
v0.9
Release Candidate
    ↓
v1.0
Production
```

---

# 7. Dependency Policy

Dependencies must be introduced when needed, not because they appear in the long-term architecture.

Before installing a package ask:

```text
Can React solve it?
        ↓
Can Next.js solve it?
        ↓
Can Tailwind/CSS solve it?
        ↓
Can browser APIs solve it?
        ↓
Can an existing dependency solve it?
        ↓
Is a new dependency justified?
```

Examples:

### Phase 1

Keep the existing lightweight stack.

### Phase 2

Introduce Supabase packages required for authentication/database access.

### Phase 3–5

Add packages only for concrete requirements.

### Phase 6

Introduce testing and monitoring infrastructure.

### Phase 7

Introduce product analytics if justified.

Do NOT install the complete future stack at once.

---

# 8. Archite
