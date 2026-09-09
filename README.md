# DSARats

**Master DSA. Build Consistency. Crack Interviews.**

DSARats is a production-quality, full-stack DSA learning platform: structured sheets, meaningful streak tracking, spaced-repetition revision, honest analytics, and interview-readiness signals — so learners know exactly what to learn, practice, and revise next.

## Status

Phase 1 (Product Planning & Technical Blueprint) is **approved**. Implementation begins with Phase 2 — Architecture & Foundation.

- **[Phase 1 Product Plan](docs/PHASE-1-PRODUCT-PLAN.md)** — architecture, sitemap, user flows, database ERD, API plan, design tokens, and the 12-phase roadmap.

## Stack

- **Web:** Next.js (App Router) + TypeScript + Tailwind CSS
- **API:** Node.js + Express.js + Prisma ORM
- **Database:** PostgreSQL (Neon for dev, managed provider in prod)
- **Auth:** JWT (access + refresh, HTTP-only cookies), Google OAuth post-MVP
- **Deployment:** Vercel (web) + Render (API)