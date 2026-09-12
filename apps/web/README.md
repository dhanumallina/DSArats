# @dsarats/web

Next.js (App Router) frontend for DSARats.

## Running

From the repository root:

```bash
npm run dev:web     # http://localhost:3000
```

The app expects the API at `NEXT_PUBLIC_API_URL` (see `.env.example`); the default is
`http://localhost:4000/api/v1`.

## Structure

- `src/app` — routes. `(public)` pages (`/`, `/sheets`, `/login`, …) and the authenticated
  app under `/app`.
- `src/components` — `ui/` is the base component kit; the rest are app-level components.
- `src/lib` — API client (`api.ts`, `server-api.ts`), redirect helper, `cn` utility.
- `src/hooks` — shared React hooks.
- `src/stores` — reserved for Zustand client state (added when first needed).

Server components read public content through `serverGet`; authenticated pages are client
components using TanStack Query via `apiFetch` (httpOnly cookies, silent token refresh).

Styling uses Tailwind CSS v4 with the design tokens defined in `src/app/globals.css`
(light and dark). Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (code).
