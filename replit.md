# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

### Final approved Less Than 10 Listeners design

The user approved the existing portrait-mobile composition and asks that it remain unchanged unless they explicitly request a redesign. The only final refinements are a deep navy Spotify CTA (#030d2a–#071541), thin electric-blue border/glow, light-blue Spotify mark (#2f9dff), white label/external-link icon, and polished warm metallic-gold “LISTENERS” lettering below clean bold white “LESS THAN 10”.

Preserve the blue/orange neon starting-count numerals, reflective environment, gold carousel frame, carousel physics and mechanical audio, selected band typography, two stats lines, Love/Share/QR, disclosures and spacing. No invented engagement figures. Do not publish without permission.

Approved mobile reference: `docs/approved-design/mobile.jpg`. Baseline checks: `node scripts/verify-approved-design.mjs`, alongside the existing reel, audio-recovery, engagement and neon-artwork checks. See `docs/approved-design/README.md` for preservation guidance.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
