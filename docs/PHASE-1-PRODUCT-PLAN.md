# DSARats — Phase 1: Complete Product & Technical Blueprint

> **Status:** **APPROVED** (v1.1 — decisions D1–D11 resolved, review updates applied) · Phase 1 (Planning only, no code)
> **Product name:** DSARats
> **Tagline:** Master DSA. Build Consistency. Crack Interviews.
> **Repo:** https://github.com/dhanumallina/DSArats
> **Date:** September 10, 2026

---

## Table of Contents

1. [Product Planning](#1-product-planning)
2. [Information Architecture](#2-information-architecture)
3. [Technical Architecture](#3-technical-architecture)
4. [Database Design](#4-database-design)
5. [API Planning](#5-api-planning)
6. [UI/UX Planning](#6-uiux-planning)
7. [Performance Planning](#7-performance-planning)
8. [Development Roadmap (Phase Breakdown)](#8-development-roadmap)
9. [Technical Assumptions](#9-technical-assumptions)
10. [Risks & Tradeoffs](#10-risks--tradeoffs)
11. [Resolved Decisions](#11-resolved-decisions)

---

# 1. Product Planning

## 1.1 Product Vision

DSARats is a **DSA learning ecosystem** — not a checklist. It answers the question:

> **"What should I learn next, what am I struggling with, and how can I improve?"**

rather than merely "How many problems have I solved?"

The product loop is: **Understand → Practice → Revise → Improve → Repeat**.

It combines structured DSA sheets, concept-based learning, daily challenges, streaks, progress analytics, spaced-repetition revision, a personal notebook, and interview-readiness signals into one consistent, premium learning product.

## 1.2 Target Users

| Segment | Primary need |
|---|---|
| Beginners learning DSA | Guided, structured start without overwhelm |
| Engineering students | Curriculum-aligned practice + revision |
| Interview-preparation students | Structured sheets, weak-topic detection, readiness estimate |
| Competitive-programming learners | Speed, patterns, higher difficulty |
| Working developers revising DSA | Efficient revision, recall of mastered topics |
| Sheet followers (A2Z, Blind 75, NeetCode 150) | Track progress across curated sheets |

**User goals (from the master spec):** create account → choose path → follow sheet → solve problems → track progress → stay consistent → revise difficult problems → understand weak topics → prepare for interviews.

## 1.3 Primary User Problems

1. **Overwhelm** — thousands of problems, no ordering of what to do next.
2. **No feedback loop** — users solve but never learn what they're bad at.
3. **Forgetting** — solved problems are forgotten within weeks; no revision trigger.
4. **Inconsistent streaks that are fake** — arbitrary check-ins instead of meaningful activity.
5. **Fragmented tools** — spreadsheets, YouTube playlists, and LeetCode bookmarks scattered.
6. **No personalized guidance** — no "do this next" signal beyond sheet order.
7. **No progress honesty** — "solved 200 problems" hides low retention and weak topics.

## 1.4 Core Value Proposition

**DSARats turns scattered problem-solving into a structured, measurable learning system** — curated sheets, meaningful streak tracking, spaced revision, honest analytics, and an interview-readiness estimate — so users know exactly what to learn, practice, and revise next.

## 1.5 Main User Journeys

### Journey A — New learner (activation)
1. Land on public site → understand value → "Start Your DSA Journey"
2. Sign up (email or Google) → verify email → complete profile
3. Choose a learning path (DSA Foundations recommended by default)
4. Start first sheet/topic → solve first problem → activity counted → streak starts

### Journey B — Daily consistency loop (retention)
1. Open dashboard → see Today's Challenge + Continue Learning + Revision Due
2. Solve daily challenge or continue sheet problem
3. Mark status → notes saved → streak updated → insight refreshed
4. See weekly activity update

### Journey C — Revision & mastery
1. Problem marked Solved → enters revision schedule
2. Dashboard shows Revision Due items → user re-solves or reviews notes
3. Mark Revised → moves to next interval → eventually Mastered
4. Notebook accumulates approach + mistakes per problem

### Journey D — Interview preparation
1. User selects Interview DSA path / company-wise sheet
2. Analytics surface weak topics + readiness score
3. User drills weak topics via daily challenge smart recommendation
4. Readiness score updates with topic coverage, revision consistency, difficulty spread

### Journey E — Returning user / account management
1. Login (email or Google) → session restored
2. Profile → settings (username, picture, theme) → account security (password reset)

## 1.6 Public Website Structure

| Section | Content |
|---|---|
| Navbar | Learn · DSA Sheets · Practice · Contests · Resources · Community · Login · **Start Learning** |
| Hero | Tagline heading, supporting text, CTAs ("Start Your DSA Journey", "Explore DSA Sheets"), subtle DSA-inspired visualization (connected nodes / minimal tree, gentle motion) |
| Learning Paths | DSA Foundations · Interview DSA · Competitive Programming · Revision Track (each: description, difficulty, time, topics, CTA) |
| DSA Sheets | A2Z, Blind 75, NeetCode 150, Company-Wise, Pattern-Based (each: problem count, difficulty distribution, topics, time, CTA). Attribution + official links; no copied paid content. |
| Why DSARats? | Pattern-based learning, structured practice, intelligent revision, daily consistency, progress intelligence, interview preparation |
| How It Works | 4 steps: Choose path → Solve problems → Revise & improve → Track growth |
| DSA Roadmap Preview | Visual vertical roadmap: Foundations → Arrays & Strings → Searching & Sorting → Linked Lists → Stacks & Queues → Trees → Graphs → Dynamic Programming → Interview Ready |
| Community / Progress | Concept of learning community (public profiles, weekly challenges, study groups, shared achievements). **No fake stats or testimonials.** |
| FAQ | What is DSARats? Who is it for? Which sheets? Streak rules? Custom sheets? Revision? Free? Mobile? |
| Footer | Product · Learning · Resources · Community · About · Contact · Privacy · Terms |

## 1.7 Logged-In Application Structure

Main navigation: Dashboard · DSA Sheets · My Learning · Practice · Daily Challenge · Revision · Progress · Analytics · Contests · Resources · Community · Profile · Settings

## 1.8 Feature Prioritization

### MVP (must have — Phase 3–6)
- Authentication (email + password, email verification, password reset, sessions; **Google OAuth deferred to post-MVP per D8**)
- DSA sheets, topics, problems (curated seed data)
- Problem page with status, notes, links, complexity
- Progress tracking (per problem, per topic, per sheet)
- Dashboard (stats, continue learning, today's challenge, weekly activity, revision due)
- Daily challenge (recommended/random) + meaningful streak system
- Revision queue with spaced repetition (1→3→7→14→30 days)
- Personal notebook (approach, mistakes, complexity, patterns)
- Basic analytics (topic progress, difficulty distribution, activity heatmap, solved-over-time)
- Light/dark theme, responsive UI, loading/empty/error states

### Post-MVP (Phase 7–8)
- Gamification (XP, achievements, streak milestones, topic badges, weekly goals)
- Community module (public profiles, study groups, weekly challenges, leaderboards)
- Interview Readiness Score (clearly labeled as an estimate)
- Advanced analytics (revision consistency, success rate, learning timeline)

### Future (post-launch, gated)
- AI Assistant (explain, hint, pattern explanation, code review, complexity, similar problems, revision questions) — uses user's learning data, guides rather than spoils
- Contests with submissions
- Code workspace with secure execution (Monaco + sandboxed runner) — **only with a real execution architecture, never a fake compiler**
- Custom user-created sheets

### Explicitly avoided initially
- Fake code execution / pretend compiler
- Fake statistics, fake testimonials, fake user counts
- Heavy 3D scenes everywhere, neon/glassmorphism effects
- Scroll-jacking, continuous decorative animations
- Childish gamification; competition-first community design
- Building the AI assistant before the core loop is stable

## 1.9 Functional Requirements (summary)

- Full auth lifecycle (register, login, logout, forgot/reset password, email verification, profile setup, username, avatar, settings; Google OAuth added post-MVP per D8)
- Sheet browsing, detail, start/continue, filtering (topic/difficulty/status/pattern), search, sort
- Problem statuses: Not Started → Attempted → Solved → Needs Revision → Revised → Mastered
- Problem metadata: title, topic, difficulty, pattern, platform, problem URL, solution URL, tags, estimated time, notes
- Daily challenge: recommended, by-topic, by-difficulty, random; completion tracking; daily history; challenge streak
- Streak: meaningful activity definition (solve / daily challenge / revision / learning session), timezone-aware dates, current + longest streak, calendar, weekly goal, monthly consistency, milestones
- Revision: queue, due-today, history, spaced repetition schedule, re-solve tracking, difficulty-after-revision
- Analytics: solved, attempted, topic progress, difficulty distribution, weekly/monthly activity, solving time, revision consistency, success rate, streak; charts; readiness estimate
- Notebook: per-problem notes (approach, mistakes, optimal approach, time/space complexity, revision notes, patterns)
- Gamification: XP, achievements, streak milestones, topic badges, personal bests, weekly goals
- Community (post-MVP): public profiles, study groups, weekly challenges, shared achievements, leaderboards
- Admin/content (light): manage sheets, topics, problems, daily challenge selection

## 1.10 Non-Functional Requirements

### Accessibility
- WCAG 2.1 AA target: keyboard navigable, focus-visible states, semantic landmarks, proper ARIA, form labels, alt text, 4.5:1 contrast (verify against both palettes), reduced-motion support, no info conveyed by color alone (statuses have text/icons)

### Performance
- LCP < 2.5s on typical mid-range mobile (4G), CLS < 0.1, INP < 200ms target
- Dashboard faster than landing page
- 60 FPS animations where practical; lazy-loaded 3D; code splitting; optimized assets; reduced-motion fallback

### Security
- No plain-text passwords (bcrypt/argon2), JWT access + refresh tokens, HTTP-only cookies (or secure storage per decision D3), rate limiting, input validation, protected routes, RBAC (user/admin), multi-user data isolation enforced at DB + API layer, secure error handling (no stack leaks), helmet-style headers, OAuth state/CSRF protection

### Reliability & Maintainability
- TypeScript across stack, Prisma schema as single source of truth, consistent API response envelope, centralized error handling, lint + format + typecheck in CI, tests for critical paths, documented env config

## 1.11 Environment / Brand Notes

- **Name:** DSARats (replaces DSAForge everywhere, including repo, package names, metadata, and docs)
- **Tagline:** Master DSA. Build Consistency. Crack Interviews. (unchanged)
- Brand personality: intelligent, focused, modern, technical, encouraging, professional, calm. No childish gamification, no exaggerated marketing.

## 1.12 Success Metrics (KPIs)

All metrics computed from real platform data only — no invented statistics.

| Metric | Definition | Launch target |
|---|---|---|
| Activation | % of signups who solve their first problem within 7 days | ≥ 40% |
| D7 retention | % of users active on ≥ 2 of the first 7 days after signup | ≥ 30% |
| D30 retention | % of users active in week 4 after signup | ≥ 15% |
| Streak adherence | % of active weeks with ≥ 4 meaningful activity days | ≥ 50% |
| Revision adherence | % of due revisions completed within 7 days of `dueAt` | ≥ 40% |
| Solve → Mastery | % of solved problems that reach MASTERED within 90 days | ≥ 20% |
| Readiness accuracy | Correlation of readiness score with user-reported interview outcomes (survey, post-MVP) | tracked, not gated |

---

# 2. Information Architecture

## 2.1 Sitemap

```
DSARats
├── Public (marketing + auth)
│   ├── /                          Home (hero, paths, sheets, why, how-it-works, roadmap, FAQ, footer)
│   ├── /learn                     Learning overview (paths + roadmap)
│   ├── /sheets                    All DSA sheets (public browse)
│   ├── /sheets/[slug]             Sheet detail (public; Start requires login)
│   ├── /practice                  Practice overview (public teaser → login)
│   ├── /contests                  Contests overview (public teaser; post-MVP)
│   ├── /resources                 Resources hub (guides, patterns, complexity cheatsheet)
│   ├── /community                 Community hub (post-MVP)
│   ├── /login                     Login
│   ├── /signup                    Sign up
│   ├── /forgot-password           Request reset
│   ├── /reset-password            Reset with token
│   ├── /verify-email              Email verification landing
│   └── /about · /contact · /privacy · /terms
│
├── App (authenticated, all under /app)
│   ├── /app/dashboard             Today's view (stats, challenge, continue, revision due, insight)
│   ├── /app/sheets                My sheets (started + browse)
│   ├── /app/sheets/[slug]         Sheet detail + progress
│   ├── /app/learning              My Learning (topics, progress by topic)
│   ├── /app/practice              Practice center (all problems, filters, search, sort)
│   ├── /app/problems/[id]         Problem detail (status, notes, links, revision)
│   ├── /app/daily-challenge       Today's challenge + history
│   ├── /app/revision              Revision queue, due today, history
│   ├── /app/progress              Progress overview
│   ├── /app/analytics             Charts + readiness estimate
│   ├── /app/contests              Contests (post-MVP)
│   ├── /app/resources             Resources (auth version, personalized)
│   ├── /app/community             Community (post-MVP)
│   ├── /app/profile/[username]    Public-ish profile (own + others, post-MVP visibility rules)
│   ├── /app/settings              Account, profile, theme, notifications, security
│   └── /app/admin                 Admin (sheets/problems/daily challenge management)
│
└── API (see §5)
```

## 2.2 Navigation Structure

**Public navbar (desktop):** Learn · DSA Sheets · Practice · Contests · Resources · Community | Login · **Start Learning** (primary CTA)

**Public navbar (mobile):** hamburger → full-screen sheet menu with same items + CTAs; no layout overflow; body scroll locked while open.

**App sidebar (desktop):** Dashboard, DSA Sheets, My Learning, Practice, Daily Challenge, Revision, Progress, Analytics, Contests, Resources, Community (grouped: Learn / Track / Grow / Connect).

**App (mobile):** bottom tab bar (Dashboard, Sheets, Practice, Revision, More) + full menu for the rest.

## 2.3 Route & Auth Matrix

| Route group | Auth | Notes |
|---|---|---|
| `/`, `/learn`, `/sheets`, `/practice`, `/contests`, `/resources`, `/community` | Public | CTAs route to signup when action needed |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` | Public-only | Redirect to `/app/dashboard` if already authenticated |
| `/app/**` | Required | Redirect to `/login?next=...` if unauthenticated; restore after login |
| `/app/admin/**` | Required + admin role | 403 otherwise |

## 2.4 Mobile Navigation Behavior

- Sticky top bar (logo + hamburger) on public pages
- Bottom navigation (5 items) in app for thumb reach
- Full overflow menu for remaining app items
- Touch targets ≥ 44px; safe-area insets respected

---

# 3. Technical Architecture

## 3.1 Stack Decision

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | SSR/SSG for public pages (fast landing), RSC-friendly, single deploy target |
| Styling | Tailwind CSS | Design tokens as config, consistent system |
| Motion | Motion / Framer Motion | Purposeful micro-interactions, reduced-motion aware |
| 3D | React Three Fiber + Three.js (lazy-loaded, hero/roadmap only) | Meaningful DSA visualization only; never page-wide |
| Charts | Recharts | Analytics charts, declarative, SSR-safe |
| Backend | Node.js + Express.js | Per master spec; decoupled API service |
| Database | PostgreSQL + Prisma ORM | Relational integrity for progress/revision; Prisma = typed schema + migrations |
| Auth | JWT (access + refresh) + Google OAuth | Stateless access, refresh rotation, HTTP-only cookies (see D3) |
| State/Data | TanStack Query (server state) + Zustand (client UI state) | Caching/invalidation for progress data; minimal global client state |
| Deployment | Vercel (web) + Render (API) + managed PostgreSQL | See D4 |
| CI/CD | GitHub Actions | typecheck, lint, tests on PR; preview deploys |
| Monorepo tooling | npm workspaces (Node 24 / npm 12) | pnpm & Docker unavailable on dev machine; npm workspaces suffice for 3 packages (D2) |

**Deliberately excluded:** Redux (overkill), CSS-in-JS (Tailwind suffices), custom auth libs (use battle-tested approach), heavy animation libs, anything added to look impressive.

## 3.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js frontend (Vercel)                              │
│  - Public pages: SSG/ISR for sheets & static content    │
│  - App pages: client components + TanStack Query        │
│  - Motion for transitions, lazy R3F for hero 3D         │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS + JSON (REST)
┌───────────────▼─────────────────────────────────────────┐
│  Express API (Render/Railway/Docker)                    │
│  - /api/auth, /api/sheets, /api/problems, /api/progress │
│  - /api/streak, /api/daily-challenge, /api/revision     │
│  - /api/analytics, /api/notes, /api/community, /api/admin│
│  - Middleware: auth, validation, rate-limit, errors     │
└───────────────┬─────────────────────────────────────────┘
                │ Prisma
┌───────────────▼─────────────────────────────────────────┐
│  PostgreSQL                                               │
│  - relational schema (see §4), migrations, indexes       │
└───────────────────────────────────────────────────────────┘
```

## 3.3 Authentication Architecture

- **Registration:** email + password (argon2/bcrypt hash); Google OAuth (server-side flow, PKCE/state) added post-MVP per D8
- **Sessions:** short-lived JWT access token (15 min) + rotating refresh token (30 days, stored hashed in DB, revocation on use/rotation detection)
- **Cookies:** HTTP-only, Secure, SameSite=Lax for both tokens (see D3); CSRF-safe via SameSite + origin checks
- **Email verification:** signed token link, verify on click
- **Password reset:** time-limited signed token, invalidated on use
- **Rate limiting:** per-IP + per-account on auth endpoints (login, register, forgot-password)
- **RBAC:** `USER` and `ADMIN` roles; admin middleware guards content-management routes

## 3.4 API Architecture

- REST, versioned under `/api/v1`
- Consistent envelope: `{ success, data?, error? }`
- Errors: standardized `{ code, message, field? }` with proper HTTP status
- Zod validation on every request body/query/params; 400 with field errors
- Central error middleware; no stack traces to client
- Pagination (`cursor`-based for problem lists, `offset` for admin)
- TanStack Query on frontend with stale-time/invalidation strategy per entity

## 3.5 State Management Strategy

- **Server state (source of truth):** TanStack Query — sheets, problems, progress, streak, revision, analytics. Cache keys namespaced by user.
- **Client state (transient):** Zustand — theme, mobile menu, sheet filters UI, notebook draft (autosaved to server).
- **Server state (auth session):** fetched via `/api/auth/me`, cached with query key `['me']`, invalidated on login/logout.

## 3.6 Data-Fetching Strategy

- Public static content (sheets list/detail, resources): SSG with ISR revalidation
- Authenticated data: client fetch via TanStack Query (auth header/cookie), optimistic updates for status flips, background refetch on window focus for streak/dashboard
- Dashboard aggregates via single `/api/dashboard` endpoint to minimize round-trips

## 3.7 Error-Handling Strategy

- Global error boundary (page-level) + route-level error/loading UI
- Form-level field errors from API validation
- Query error states: friendly message + retry button; specific guidance for 401 (re-auth) vs 429 (slow down) vs 5xx (try later)
- Unhandled promise rejections logged (client + server)

## 3.8 File & Folder Structure (planned)

```
DSArats/
├── apps/
│   ├── web/                      # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/              # routes (public + /app)
│   │   │   ├── components/       # ui/, layout/, features/, public/, app/
│   │   │   ├── lib/              # api client, auth, utils
│   │   │   ├── hooks/
│   │   │   ├── stores/           # zustand
│   │   │   └── styles/           # tokens, globals
│   │   ├── public/               # static assets (optimized)
│   │   └── next.config.ts
│   └── api/                      # Express API
│       └── src/
│           ├── routes/           # auth, sheets, problems, progress, streak,
│           │                     # daily-challenge, revision, analytics, notes, admin
│           ├── middleware/       # auth, rate-limit, error, validation
│           ├── services/         # business logic (streak calc, revision schedule)
│           ├── prisma/           # schema.prisma + migrations
│           └── utils/
├── packages/
│   ├── shared/                   # types, zod schemas, constants (shared FE/BE)
│   └── seed-data/                # curated sheets/topics/problems seed scripts
├── docs/                         # this plan + phase docs
├── docker/                       # (optional) prod manifests; dev DB = Neon
├── .github/workflows/            # CI
└── package.json                  # npm workspaces root (engines, scripts)
```

## 3.9 Environment Configuration

- `.env.example` in each app with documented vars (DATABASE_URL, JWT secrets, GOOGLE_CLIENT_ID/SECRET, FRONTEND_URL, API_URL, REDIS_URL if rate-limit store)
- Zod-validated env at startup; fails fast with clear message
- No secrets committed; `.env` gitignored

## 3.10 Deployment Architecture

- **Frontend:** Vercel (public pages SSG/ISR; app pages dynamic)
- **API:** Render/Railway (Docker image) — long-running service, migrations run on release
- **DB (prod):** managed PostgreSQL (Render-managed or Neon) with automated backups; **DB (dev):** Neon free tier (no local Docker/Postgres on dev machine, D11)
- **CI:** GitHub Actions — install, typecheck, lint, unit tests; preview deployment per PR; production on main
- **DNS:** custom domain → Vercel; API at `api.dsarats.com`

## 3.11 Testing Architecture

- **Unit:** Vitest — services (streak calc, revision scheduler, validation schemas)
- **Integration:** Supertest against Express with a test PG database (isolated per test run)
- **E2E (post-MVP):** Playwright — auth flow, solve → streak, revision cycle, mobile viewport checks
- **Layers:** API contract tests for every endpoint's happy + error paths

## 3.12 Scalability Considerations

- Stateless API (JWT) → horizontal scaling trivial
- Read-heavy public pages served via CDN/ISR
- Query efficiency: composite indexes on progress/problem lookups; dashboard via single aggregate query
- Rate limiting via shared store (Redis) when multiple API instances
- Seed data static content cached; user rows indexed by `userId`

---

# 4. Database Design

## 4.1 Entity-Relationship Overview

```
User 1──N Profile (1:1, embedded vs separate → decision D6)
User 1──N UserProblem (progress per problem)
User 1──N RevisionSchedule
User 1──N DailyChallenge (completions)
User 1──N Note
User 1──N ActivityLog
User 1──N UserAchievement
User 1──N UserSheetProgress
User 1──N StreakRecord (per-day activity summary)
User 1──N XPTransaction (post-MVP)

DSASheet 1──N SheetTopic (order matters)
Topic 1──N Problem
DSASheet N──N Problem (via SheetProblem, ordered, per-sheet metadata)
Problem 1──N UserProblem
Problem 1──N RevisionSchedule
Problem 1──N Note

Contest 1──N ContestProblem (post-MVP) ; Contest 1──N ContestSubmission
```

## 4.2 Core Entities & Key Fields

### User
- `id` (uuid, PK), `email` (citext, unique), `passwordHash` (nullable for OAuth-only)
- `googleId` (unique, nullable), `role` (USER | ADMIN)
- `emailVerifiedAt` (nullable), `status` (ACTIVE | DISABLED)
- `createdAt`, `updatedAt`
- Indexes: email, googleId

### Profile
- `id`, `userId` (FK, unique), `username` (unique, slug-safe), `displayName`
- `avatarUrl` (nullable), `bio`, `timezone` (default UTC), `theme` (LIGHT|DARK|SYSTEM)
- `learningGoal` (problems/week, nullable), `onboardedAt` (nullable)
- Indexes: username

### DSASheet
- `id`, `slug` (unique), `name`, `description`, `difficulty` (BEGINNER|INTERMEDIATE|ADVANCED)
- `estimatedHours`, `isPublished`, `sourceAttribution` (e.g., "Striver's A2Z — official link"), `order`
- `createdAt`, `updatedAt`
- Indexes: slug, isPublished

### Topic
- `id`, `slug` (unique), `name`, `description`, `order`, `iconKey` (nullable)

### Problem
- `id`, `slug` (unique), `title`, `difficulty` (EASY|MEDIUM|HARD)
- `topicId` (FK), `pattern` (nullable), `platform` (LEETCODE|GEEKSFORGEEKS|CODE_FORCES|OTHER)
- `platformProblemUrl` (unique per platform+externalId), `externalId`
- `solutionUrl` (nullable), `tags` (string[]), `estimatedMinutes` (int)
- `timeComplexityHint`, `spaceComplexityHint` (nullable, educational)
- `isPublished`, `createdAt`, `updatedAt`
- Indexes: topicId, difficulty, isPublished, (platform, externalId) unique

### SheetProblem (join + ordering)
- `id`, `sheetId` (FK), `problemId` (FK), `position` (int), `isCore` (bool, nullable)
- Unique (sheetId, problemId), unique (sheetId, position)

### UserSheetProgress
- `id`, `userId` (FK), `sheetId` (FK), `status` (NOT_STARTED|IN_PROGRESS|COMPLETED)
- `currentTopicId` (nullable FK), `startedAt`, `completedAt` (nullable)
- Unique (userId, sheetId)

### UserProblem
- `id`, `userId` (FK), `problemId` (FK)
- `status` (NOT_STARTED|ATTEMPTED|SOLVED|NEEDS_REVISION|REVISED|MASTERED)
- `firstSolvedAt`, `lastActivityAt`, `solveCount` (int, re-solve tracking)
- `difficultyAfterRevision` (EASIER|SAME|HARDER, nullable)
- `lastRevisionAt` (nullable), `xpEarned` (int, post-MVP)
- Unique (userId, problemId)
- Indexes: (userId, status), (userId, topicId via join)

### RevisionSchedule
- `id`, `userId` (FK), `problemId` (FK)
- `stage` (int 0..4 → intervals 1/3/7/14/30 days), `dueAt` (timestamptz)
- `lastReviewedAt`, `timesReviewed` (int)
- Unique (userId, problemId)
- Index: (userId, dueAt) — powers "Revision Due"

### StreakRecord
- `id`, `userId` (FK), `activeDate` (date), `activityTypes` (string[])
- `problemsSolved` (int, day count), `sessionsCount` (int)
- Unique (userId, activeDate)
- Index: (userId, activeDate DESC)

### DailyChallenge
- `id`, `date` (date, unique), `problemId` (FK), `title`, `reason` (nullable — "based on your weak topics")
- `createdBy` (admin userId, nullable), `createdAt`

### DailyChallengeCompletion
- `id`, `userId` (FK), `challengeId` (FK), `status` (SOLVED|ATTEMPTED|SKIPPED), `completedAt`
- Unique (userId, challengeId)

### Note
- `id`, `userId` (FK), `problemId` (FK)
- `approach`, `mistakes`, `optimalApproach`, `revisionNotes`, `keyPatterns` (text columns, nullable)
- `updatedAt` (for autosave)
- Unique (userId, problemId)

### ActivityLog
- `id`, `userId` (FK), `type` (PROBLEM_SOLVED|PROBLEM_ATTEMPTED|REVISION_COMPLETED|DAILY_CHALLENGE|NOTE_UPDATED|LEARNING_SESSION)
- `refId` (nullable — problemId/challengeId), `metadata` (jsonb), `occurredAt` (timestamptz)
- Index: (userId, occurredAt DESC)

### Achievement / UserAchievement (post-MVP)
- `Achievement`: id, key (unique), name, description, iconKey, criteria (jsonb)
- `UserAchievement`: id, userId (FK), achievementId (FK), unlockedAt — unique (userId, achievementId)

### Contest / ContestProblem / ContestSubmission (post-MVP)
- `Contest`: id, slug, title, startsAt, endsAt, isPublished
- `ContestProblem`: contestId + problemId + position + points
- `ContestSubmission`: userId + contestId + problemId, status, score, submittedAt

### Session (refresh tokens)
- `id`, `userId` (FK), `tokenHash` (unique), `expiresAt`, `revokedAt`, `userAgent`, `ip`, `createdAt`
- Index: (userId), (tokenHash), (expiresAt)

## 4.3 Streak Calculation Structure

- **Meaningful day rule:** a day is active if ≥1 `ActivityLog` row with type in {PROBLEM_SOLVED, REVISION_COMPLETED, DAILY_CHALLENGE, LEARNING_SESSION} exists for that user on that calendar day (in the user's timezone).
- **Storage:** one `StreakRecord` row per (user, date), written idempotently on activity (upsert; duplicate activity on same day does not double-count).
- **Current streak:** computed by walking `StreakRecord` backwards from today in the user's timezone. Today not yet active → check yesterday as fallback (grace so the streak doesn't die mid-day).
- **Longest streak:** cached on Profile (`longestStreak`) updated when current exceeds it.
- **Weekly goal / monthly consistency:** aggregate counts over ISO week / calendar month.

## 4.4 Revision Scheduling Structure

- On marking a problem **Solved** → create `RevisionSchedule` with `stage=0`, `dueAt = now + 1 day`.
- On marking **Revised**: `timesReviewed += 1`, advance stage (0→1→2→3→4), `dueAt = now + interval[stage]` where intervals = [1, 3, 7, 14, 30] days. `stage` caps at 4 (30-day cycle repeats until Mastered).
- On marking **Mastered** → schedule row deleted (or archived with `archivedAt` for history).
- Re-solving a problem that's due but marked Needs Revision keeps schedule but restarts interval on next Revised.

## 4.5 Data Validation Rules (summary)

- email: valid format, unique; password: min 8 chars (max 72 for bcrypt), confirm-match on register
- username: 3–20 chars, `[a-z0-9_]`, unique, reserved words blocked
- problem status transitions: NOT_STARTED→ATTEMPTED→SOLVED→NEEDS_REVISION/REVISED→MASTERED (allow direct skip on re-solve with audit via ActivityLog)
- difficulty ∈ {EASY, MEDIUM, HARD}; sheet difficulty ∈ {BEGINNER, INTERMEDIATE, ADVANCED}
- estimatedMinutes > 0; position ≥ 0; dueAt in future
- All text lengths bounded; notes max ~20k chars per field

## 4.6 Multi-User Isolation

- Every user-scoped query must include `userId` in the WHERE clause; Prisma client pre-scoped by auth middleware; API-level tests assert user A cannot read/modify user B's rows (returns 404, not 403, to avoid existence leaks).

---

# 5. API Planning

Base: `/api/v1` · Auth: access token (cookie) · Validation: Zod · Errors: envelope with `code`

## 5.1 Auth

| Method | Route | Purpose | Auth | Request | Response | Validation | Errors |
|---|---|---|---|---|---|---|---|
| POST | /auth/register | Create account | No | `{email, password, confirmPassword, username, displayName?}` | `201 {user}` + sets cookies | email format, pw ≥8, username rules, confirm match | 409 email/username taken, 400 validation |
| POST | /auth/login | Email login | No | `{email, password}` | `200 {user}` + cookies | both required | 401 invalid credentials, 429 rate-limited |
| POST | /auth/logout | Revoke session | Yes | — | `204` | — | 401 if invalid token (idempotent) |
| GET | /auth/me | Current user + profile | Yes | — | `200 {user, profile}` | — | 401 |
| POST | /auth/google | Google OAuth callback | No | `{credential/code, state}` | `200 {user}` + cookies | code + state | 400 state mismatch, 401 invalid code |
| POST | /auth/forgot-password | Send reset link | No | `{email}` | `200` (always, even if not found) | email format | 429 rate-limited |
| POST | /auth/reset-password | Set new password | No (token in body) | `{token, password, confirmPassword}` | `204` | token valid, pw ≥8, confirm | 400 invalid/expired token |
| GET | /auth/verify-email | Verify email | No (token) | query `token` | redirect or `200` | token | 400 invalid/expired |
| POST | /auth/refresh | Rotate refresh token | Refresh cookie | — | `200` new access | — | 401 refresh invalid/revoked |

## 5.2 User / Profile

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| GET | /users/me/profile | Get own profile | Yes | merged in /auth/me too |
| PATCH | /users/me/profile | Update profile | Yes | `{username?, displayName?, bio?, timezone?, theme?, avatarUrl?, learningGoal?}`; zod-validated |
| POST | /users/me/avatar | Upload avatar | Yes | multipart, image validation, size/type limits |
| PATCH | /users/me/settings | Account settings | Yes | `{theme, notifications}` |
| DELETE | /users/me | Deactivate account | Yes | soft-delete, confirm body |
| GET | /users/:username | Public profile (post-MVP) | No | safe projection only |

## 5.3 Sheets & Topics

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| GET | /sheets | List published sheets | No | includes counts + difficulty distribution |
| GET | /sheets/:slug | Sheet detail | No | problems list + topics; progress included if authed |
| POST | /sheets/:slug/start | Start/join sheet | Yes | creates UserSheetProgress |
| POST | /sheets/:slug/complete-topic | Advance current topic | Yes | body `{topicId}` |
| GET | /topics | List topics | No | ordered |
| GET | /topics/:slug/problems | Problems in topic | Yes | paginated, filterable |

## 5.4 Problems

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| GET | /problems | List/search/filter | Yes | query: `sheet? topic? difficulty? status? pattern? platform? q? sort? cursor?` |
| GET | /problems/:id | Problem detail | Yes | includes user status, notes, revision state |
| PATCH | /problems/:id/progress | Set status | Yes | body `{status}`; triggers revision schedule + activity + streak upsert (atomic transaction) |
| GET | /problems/:id/related | Related problems | Yes | same topic/pattern |
| GET | /problems/:id/notes | Get note | Yes | |
| PUT | /problems/:id/notes | Upsert note | Yes | partial fields; autosave-friendly |

## 5.5 Progress & Dashboard

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| GET | /progress | Summary by topic/sheet/status | Yes | aggregates |
| GET | /dashboard | Single dashboard payload | Yes | stats, challenge, continue-learning, revision due, weekly activity, insight |
| GET | /progress/heatmap | Activity heatmap data | Yes | `?year=` or range |

## 5.6 Streak & Daily Challenge

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| GET | /streak | Current, longest, calendar | Yes | timezone-aware |
| GET | /daily-challenge | Today's challenge | Yes | creates or fetches; includes smart recommendation |
| POST | /daily-challenge/complete | Mark complete | Yes | body `{status: SOLVED|ATTEMPTED|SKIPPED}` |
| GET | /daily-challenge/history | Past challenges | Yes | paginated |

## 5.7 Revision

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| GET | /revision | Queue + due today | Yes | filters: `due`/`all` |
| POST | /revision/:problemId/complete | Mark revised | Yes | body `{difficultyAfterRevision?}`; advances schedule |
| GET | /revision/history | Revision history | Yes | paginated |

## 5.8 Analytics

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| GET | /analytics | All chart data | Yes | topic progress, difficulty distribution, solved-over-time, revision activity, success rate, readiness estimate |
| GET | /analytics/readiness | Interview Readiness Score | Yes | clearly labeled estimate; `{score, factors, disclaimer}` |

## 5.9 Gamification (post-MVP)

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | /xp | XP + level | Yes |
| GET | /achievements | Achievements + unlocked | Yes |
| GET | /leaderboards | Community leaderboards | Yes |

## 5.10 Community (post-MVP)

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | /community/activity | Recent public activity | No |
| POST | /community/groups | Create study group | Yes |
| GET | /community/groups | List groups | No |
| POST | /community/groups/:id/join | Join group | Yes |

## 5.11 Admin / Content Management

| Method | Route | Purpose | Auth | Notes |
|---|---|---|---|---|
| POST | /admin/sheets | Create sheet | Admin | full sheet payload |
| PATCH | /admin/sheets/:id | Update sheet | Admin | |
| POST | /admin/problems | Create problem | Admin | unique (platform, externalId) |
| PATCH | /admin/problems/:id | Update problem | Admin | |
| POST | /admin/sheets/:id/problems | Add problem to sheet | Admin | `{problemId, position}` |
| POST | /admin/daily-challenge | Schedule challenge | Admin | `{date, problemId}` or auto |
| GET | /admin/stats | Platform stats | Admin | non-fake aggregate usage (no invented numbers) |

## 5.12 Cross-Cutting API Rules

- All user-scoped reads return 404 (not 403) for other users' resources
- Idempotency: PATCH progress and POST challenge/complete are safe to retry (upserts + activity dedupe by day)
- Consistency: status change, revision schedule creation, activity log, streak upsert in a single transaction
- Pagination: `cursor` = opaque base64 token encoding `(createdAt, id)` for cursor-based lists; admin lists use `offset/limit`

## 5.13 Error Code Catalog & Rate Limiting

Standard error envelope: `{ success: false, error: { code, message, field? } }`

| HTTP | code | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Zod validation error; `field` set |
| 401 | `UNAUTHENTICATED` | Missing/invalid access token |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 403 | `FORBIDDEN` | Authenticated but not allowed (e.g., non-admin on admin route) |
| 404 | `NOT_FOUND` | Resource missing or not owned by the user |
| 409 | `CONFLICT` | Unique violation (email/username taken) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected; generic message only, no stack leaks |

Rate limits (per IP unless noted; Redis-backed shared store in production):
- **Auth endpoints** (login, register, forgot-password, reset-password): 5 req/min/IP, plus per-account lockout after 10 failed logins (15 min)
- **General API:** 100 req/min/IP
- **Daily-challenge creation:** cached per user per day (no API hammering)

---

# 6. UI/UX Planning

## 6.1 Design Principles

Premium, minimal, developer-designed. Modern EdTech + developer dashboard + editorial product design. No gaming vibes, no generic SaaS template, no LeetCode clone, no flashy AI landing. Hierarchy, readability, consistency, subtle motion — not gradients/effects.

## 6.2 Design Tokens

### Light theme (warm cream + black + muted golden-yellow)

```text
--bg:            #FAF8F2
--surface:       #FFFEFA
--text-primary:  #171717
--text-secondary:#5C5A54
--text-muted:    #77756D
--accent:        #D9A441
--accent-hover:  #B8862D
--border:        #E8E2D6
--border-strong: #D9A441
--success:       #5F8D6A
--error:         #B85C5C
--shadow:        0 1px 2px rgba(23,23,23,.04), 0 4px 12px rgba(23,23,23,.06)
```

### Dark theme (warm charcoal + off-white + muted amber)

```text
--bg:            #171716
--bg-secondary:  #1F1F1D
--surface:       #242421
--text-primary:  #F2F0E8
--text-secondary:#A6A49B
--text-muted:    #77756D
--accent:        #C9A45C
--accent-hover:  #D6B875
--border:        #35352F
--border-strong: #6B5835
--success:       #7C9A82
--error:         #B97878
--shadow:        subtle, low-opacity black
```

Themes share spacing, type hierarchy, component structure, and interaction behavior — same product, not inverted colors.

## 6.3 Typography

- **Display/headings:** a geometric sans with strong hierarchy (e.g., Inter Tight / Space Grotesk — **final choice in Phase 2**, must render well on Windows)
- **Body/UI:** Inter (or system-ui fallback)
- **Code/mono accents:** JetBrains Mono / IBM Plex Mono for complexity labels, patterns
- Scale: 12/14/16 (body), 18/24/32/48 (headings); `font-feature-settings` for tabular numerals in stats
- Line-height 1.6 body, tighter for headings; max measure ~68ch for prose

## 6.4 Spacing System

4px base grid: `4, 8, 12, 16, 24, 32, 48, 64, 96`. Section padding 96/64 desktop, 48/32 mobile. Consistent card padding 24/20.

## 6.5 Component System

| Component | Notes |
|---|---|
| Button | Primary (black, light theme; off-white on dark), secondary (outline), ghost, danger; sizes sm/md/lg; loading spinner; focus-visible ring |
| Form | Label + input + helper + error; 44px targets; autofill styles; password visibility toggle |
| Card | Surface + border + radius 12px; hover lift only where interactive; no continuous animation |
| Badge | Difficulty (EASY/MEDIUM/HARD with muted color chips + text — not color-only), status, pattern |
| Table / List | Problem rows: title, topic, difficulty, status, pattern, links; sticky header; dense on desktop, cards on mobile |
| ProgressBar | Sheet/topic progress; animated on change only; reduced-motion safe |
| Heatmap | Weekly activity (dashboard) + full-year (progress) |
| EmptyState | Illustration-free, helpful text + CTA (e.g., "No revision due today") |
| LoadingState | Skeletons matching final layout (no layout shift) |
| ErrorState | Friendly message + retry |
| Toast | Success/error confirmations (e.g., status saved) |
| Sidebar / TabBar | App navigation (see §2.2) |
| Modal/Drawer | Mobile menu, confirmations, note editor |

## 6.6 Key Page Layouts

- **Dashboard:** greeting + stat row (streak, solved, progress, goal) → Today's Challenge card → Continue Learning → Revision Due → Weekly Activity → Topic Progress → Personalized Insight
- **Sheet detail:** header (meta: count, difficulty distribution, topics, time, Start/Continue CTA) → topic accordion with problems table
- **Problem page:** header (title, difficulty, topic, pattern, platform link, solution link, status controls) → notebook section → revision state → complexity hints → related problems
- **Analytics:** stat tiles → charts (topic bars, difficulty distribution, solved-over-time line, revision activity, heatmap) → readiness estimate card with disclaimer

## 6.7 Responsive Behavior

- Public: fluid type/spacing; nav collapses to drawer ≤ 1024px
- App: sidebar → top bar + bottom tabs on mobile; tables → stacked cards; charts → simplified variants
- Touch targets ≥ 44px; no horizontal scroll; safe-area insets

## 6.8 State Design

- **Loading:** skeletons (layout-stable)
- **Empty:** helpful copy + next action (e.g., "Start your first sheet")
- **Error:** message + retry; 401 → re-auth flow; 429 → respectful backoff copy
- **Success:** toasts for saves; optimistic updates with rollback on failure

## 6.9 Accessibility Behavior

Semantic landmarks, skip-link, ARIA for nav/menus/accordions/charts (table fallback for chart data), focus-visible styles, form labels/errors linked via aria-describedby, contrast verified per theme, `prefers-reduced-motion` honored globally, status never conveyed by color alone.

## 6.10 Animation Principles

Purposeful only: page transitions (fade/slide 150–250ms), section reveals on scroll (once), hover micro-interactions (100–150ms), progress fill animation, reduced-motion → opacity-only or none. No scroll-jacking, no continuous card animations, no excessive blur/glow.

## 6.11 3D Usage Strategy

- **Where:** hero visualization (connected nodes / tree / algorithm geometry) and possibly the roadmap preview — lazy-loaded R3F
- **Rules:** communicate DSA concepts only; GPU-friendly; fade in after load; pause on reduced-motion; no 3D in dashboard; mobile: lighter variant or static fallback
- **Never:** page-wide scenes, heavy models, neon glow, continuous animation

---

# 7. Performance Planning

| Goal | Approach |
|---|---|
| Fast initial load | SSG/ISR public pages; minimal JS above fold; font display swap + preload critical |
| Fast dashboard | Single aggregate `/api/dashboard`; skeleton UI; no waterfall |
| Smooth scrolling | CSS transforms/opacity only; `content-visibility` on long lists; no scroll-jack |
| 60 FPS animations | GPU-friendly props; rAF-gated chart updates; cap re-render scope |
| Lazy 3D | `dynamic()` + `ssr:false` for R3F; IntersectionObserver mount; device/motion guards |
| Code splitting | Route-based; dynamic import of Monaco (if added), Recharts, R3F |
| Optimized assets | AVIF/WebP, responsive `next/image`, no giant unoptimized images |
| Minimal re-renders | TanStack Query caching; memoized chart components; zustand slices scoped |
| Mobile performance | Reduced effects on small screens; bottom nav; static hero fallback |
| Reduced motion | `prefers-reduced-motion` respected in all animation wrappers |
| Budgets | Track bundle size in CI; Lighthouse CI thresholds (LCP/CLS/INP) |

---

# 8. Development Roadmap

> Per master prompt §27 & execution protocol. Each phase ends with testing + review + approval gate. **Phases 2+ are implementation; nothing in Phase 1.**

## Phase 1 — Product Understanding & Planning (THIS DOCUMENT)
- **Objective:** complete blueprint, no code
- **Deliverables:** this document → architecture, sitemap, user flows, ERD, API plan, component architecture, design tokens, roadmap, assumptions, risks
- **DoD:** document approved by user; open decisions resolved

## Phase 2 — Architecture & Foundation
- **Objective:** foundation that everything builds on
- **Scope:** monorepo setup (apps/web + apps/api + packages/shared), Next.js + Express + Prisma configured, dev PG up (Neon free tier — D11), env config, Tailwind tokens (light/dark), base UI kit (Button, Card, Input, Badge, ProgressBar, Skeleton, EmptyState, ErrorState, Toast), theme provider, auth foundation (email/password register/login/me/refresh/logout + middleware + RBAC; OAuth deferred), basic routing (public + /app shell), CI (typecheck/lint/test)
- **Testing:** unit tests for validation; integration for auth; typecheck clean; build passes
- **DoD:** user can register/login/logout; themes switch; UI kit renders; CI green

## Phase 3 — DSA Sheets & Problem System
- **Objective:** the content backbone
- **Scope:** Prisma schema + migrations for content entities; seed data (**Foundation sheet + Blind 75 only, per D5** — public metadata + official links only, no copied explanations); sheets/topics/problems CRUD (admin), public browse + detail, search/filter/sort, user sheet start/continue
- **Testing:** API integration tests; seed idempotency; search/filter edge cases
- **DoD:** browse sheets → start → see ordered problems; admin can manage content

## Phase 4 — Progress, Streak & Daily Challenge
- **Objective:** the core tracking loop
- **Scope:** UserProblem statuses with transactional updates, dashboard payload, weekly activity, meaningful streak (timezone-aware, dedupe), daily challenge (recommended/random/topic/difficulty) + completion + history
- **Testing:** streak math (timezone, dedupe, grace), status transitions, isolation
- **DoD:** solve a problem → streak + dashboard update correctly; duplicate actions don't double-count

## Phase 5 — Revision System & Notebook
- **Objective:** retention engine
- **Scope:** revision queue (1→3→7→14→30), due-today, revise/re-solve flow, difficulty-after-revision, history; notebook (approach/mistakes/complexity/patterns, autosave)
- **Testing:** schedule progression, overdue behavior, re-solve handling
- **DoD:** solved problem appears in revision at correct intervals; notes persist across sessions

## Phase 6 — Analytics, Gamification & Interview Readiness
- **Objective:** progress intelligence
- **Scope:** analytics endpoints + charts (topic, difficulty, over-time, revision, heatmap), XP/achievements/streak milestones/topic badges/weekly goals, Interview Readiness Score (estimate, labeled, with factors + disclaimer)
- **Testing:** chart data correctness, readiness math sanity, achievement triggers
- **DoD:** user sees honest progress + estimate with no unsupported claims

## Phase 7 — Community & Advanced (post-MVP)
- **Objective:** optional advanced module
- **Scope:** public profiles, study groups, weekly challenges, shared achievements, leaderboards; contests (skeleton) — gated by approval
- **Testing:** visibility rules, group membership flows
- **DoD:** community features work with correct privacy; no fabricated stats

## Phase 8 — UI/UX Refinement & Animations
- **Objective:** premium feel
- **Scope:** typography/spacing/color audit, hierarchy, empty/loading/error polish, micro-interactions, page transitions, lazy hero 3D, reduced-motion pass, accessibility audit (AA)
- **Testing:** Lighthouse + axe; manual visual review
- **DoD:** design-system consistent; no visual noise; AA on key flows

## Phase 9 — Performance & Responsiveness
- **Objective:** fast everywhere
- **Scope:** bundle budgets, code splitting, image optimization, chart/3D performance, mobile pass, INP/LCP/CLS targets, slow-network behavior
- **Testing:** Lighthouse CI, real-device spot checks
- **DoD:** performance budgets met on dashboard + landing

## Phase 10 — Testing, Security & Bug Fixing
- **Objective:** harden
- **Scope:** auth security review (rate limiting, token rotation, OAuth), input validation fuzzing, isolation tests, E2E (Playwright) critical flows, edge cases, console-error sweep
- **Testing:** full suite green; security checklist complete
- **DoD:** no critical/high issues open

## Phase 11 — Final Audit & Deployment Readiness
- **Objective:** finish
- **Scope:** review as senior engineer + designer + QA + real user; fix inconsistencies; remove dead code; verify all features; deployment config (Vercel/Render, migrations, backups); docs
- **Testing:** full regression; production-like staging
- **DoD:** deployable; definition of done satisfied per phase checklist

## Phase 12 — AI Assistant (gated, post-core)
- **Objective:** guided learning companion
- **Scope:** explain/hint/pattern/code review/complexity/similar problems/revision questions; uses user learning data; spoiler-guarded (hints before solutions); never reveals full solution unless asked
- **Testing:** prompt safety, data scoping, rate limits
- **DoD:** AI adds value on stable core, respects learner pacing

---

# 9. Technical Assumptions

1. Postgres is provisioned — dev: Neon free tier (no local Docker/Postgres on dev machine); prod: managed Postgres (Render/Neon).
2. Google OAuth is deferred to post-MVP (D8). Phases 2–3 ship email/password auth only; Google wiring happens when the user provides client ID/secret.
3. Seed content = curated public problem metadata with official links. No copyrighted explanations, paid content, or copied sheet branding beyond attribution. Sheet names (e.g., Blind 75) are used as identifiers with attribution links.
4. "Platform" links open externally (LeetCode/GfG/Codeforces) — the product tracks, does not host problems.
5. Code execution workspace is out of MVP; if added later, it uses a real sandboxed runner (e.g., Piston) with strict limits — never a fake compiler.
6. Email delivery (verification/reset) uses a transactional provider (e.g., Resend — already familiar in this environment) with dev fallback logging.
7. Monorepo with npm workspaces (npm 12 / Node 24). pnpm and Docker are not installed on the dev machine, so npm workspaces is the pragmatic choice (D2).
8. Analytics numbers are computed from real user data only; public site shows product capability, not fake stats.
9. Timezone handling: store UTC, compute day boundaries per user profile timezone.
10. Backend as separate Express service per master spec, even though Next.js route handlers could host APIs — honors the spec and keeps API deployable independently.

---

# 10. Risks & Tradeoffs

| # | Risk / Tradeoff | Impact | Mitigation |
|---|---|---|---|
| R1 | Scope creep (AI, contests, code execution, community all at once) | Delayed core | Strict MVP cut; advanced features gated behind approval |
| R2 | Seed data quality / licensing | Legal + content debt | Public metadata + official links only; attribution; admin CRUD |
| R3 | Streak fairness complaints (timezone, grace) | Trust | Clear, documented rules; timezone-aware; meaningful-activity only |
| R4 | Two services (web + API) adds ops complexity | Deploy friction | Managed hosting (Vercel + Render + managed PG); dev DB on Neon free tier; documented CI |
| R5 | 3D hurts performance | UX on low-end devices | Lazy-load, device/motion guards, static fallback, budgets in CI |
| R6 | Revision algorithm too naive or too complex | Retention quality | Start with explainable 1/3/7/14/30; revisit with real data |
| R7 | OAuth + JWT misconfiguration (refresh rotation bugs) | Security | Refresh rotation + reuse detection; tested auth flows; rate limits |
| R8 | Seed data volume for 5 sheets is large | Time | Prioritize: Foundation sheet + Blind 75 first; others via admin tooling |
| R9 | Readiness score misinterpreted as guarantee | Trust | Labeled estimate with factors + disclaimer; no fake precision |
| R10 | Single-owner content maintenance | Content staleness | Admin CRUD from day one; import scripts |
| R11 | Windows dev environment quirks (case-sensitivity, path issues) | Dev friction | Consistent POSIX tooling; CI on Linux catches platform bugs |
| R12 | Dev depends on managed PG (no local Postgres/Docker) | Dev friction, free-tier limits | Neon free tier for dev; connection string only in `.env` (never committed); prod uses a separate managed instance |

---

# 11. Resolved Decisions

| # | Decision | Resolution |
|---|---|---|
| D1 | Monorepo vs single app | **Monorepo** — apps/web + apps/api + packages/shared |
| D2 | Package manager | **npm workspaces** (npm 12; pnpm not installed) |
| D3 | Auth token storage | **HTTP-only cookies** (access + refresh; Secure, SameSite=Lax) |
| D4 | Deployment target | **Vercel (web) + Render (API) + managed PostgreSQL** |
| D5 | Seed scope for MVP | **Foundation sheet + Blind 75 first**; rest via admin tooling |
| D6 | Profile storage | **Separate Profile table** |
| D7 | Email provider | **Resend** |
| D8 | Google OAuth | **Deferred to post-MVP**; user supplies client ID/secret later |
| D9 | AI Assistant | **Phase 12 gated**, only after core is stable |
| D10 | Contests | **Post-MVP** skeleton; public page is a capability teaser |
| D11 | Dev database | **Neon free tier (managed Postgres)** — no local Docker/Postgres on dev machine |

---

## Phase 1 Sign-off

**Phase 1 approved.** This document (v1.1) is the single source of truth for all later phases. No application code was written during Phase 1.

Next: **Phase 2 — Architecture & Foundation** (awaiting the go-ahead).