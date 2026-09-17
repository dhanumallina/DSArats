# DSARats

**Master DSA. Build Consistency. Crack Interviews.**

DSARats is a production-quality, full-stack DSA learning platform: structured sheets, meaningful streak tracking, spaced-repetition revision, honest analytics, and interview-readiness signals — so learners know exactly what to learn, practice, and revise next.

## Status

Phases 1–6 are **complete**.

| Phase | Delivers | State |
|---|---|---|
| 1 · Product & technical blueprint | Architecture, ERD, API plan, design tokens, roadmap | ✅ |
| 2 · Architecture & foundation | Monorepo, auth + RBAC, UI kit, theming, CI | ✅ |
| 3 · Sheets & problem system | Seeded catalog, admin CRUD, browse/search/detail, sheet progress | ✅ |
| 4 · Progress, streak & daily challenge | Transactional statuses, weekly activity, timezone-aware streaks, per-user daily challenge, dashboard/progress APIs + UI | ✅ |
| 5 · Revision & notebook | Spaced revision (1→3→7→14→30), due queue + history, per-problem notebook with autosave | ✅ |
| 6 · Analytics, gamification & readiness | Charts (coverage, difficulty, solves over time, revision), XP + levels, achievements, labelled interview-readiness estimate | ✅ |

Next: **Phase 7 — Community & Advanced (post-MVP)**.

- **[Phase 1 Product Plan](docs/PHASE-1-PRODUCT-PLAN.md)** — architecture, sitemap, user flows, database ERD, API plan, design tokens, and the 12-phase roadmap.

> Everything shown is computed from real user data — there are no fabricated statistics anywhere in the product.

## Stack

- **Web:** Next.js (App Router) + TypeScript + Tailwind CSS
- **API:** Node.js + Express.js + Prisma ORM
- **Database:** PostgreSQL (Neon for dev, managed provider in prod)
- **Auth:** JWT (access + refresh, HTTP-only cookies), Google OAuth post-MVP
- **Deployment:** Vercel (web) + Render (API)