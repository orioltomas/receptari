# Receptari

Recipe manager. pnpm monorepo: `apps/api` (Fastify 5 + Drizzle), `apps/web`
(Nuxt 3 SPA + PrimeVue), `packages/shared` (Zod schemas shared by both).
See `README.md` for the stack, setup and commands.

## Agent workflow

Before implementing anything:

1. Read `.agents/hard-rules.md` — binding business decisions. If the requested
   work contradicts an active rule, STOP and raise it; do not resolve it alone.
2. Read `.agents/reference.md` for domain vocabulary.
3. Work only from a spec in `.agents/specs/` with `status: ready` or
   `in-progress`. Never implement from a `draft` spec.

- New feature or unclear task → run `/grilling` first, never write code straight away.
- A `ready` spec → run `/spec-to-issues` to split it into parallel GitHub issues.
- A new business decision taken in conversation → record it in `.agents/hard-rules.md`.
- All issues of a spec closed → delete the spec file; the code is the record.

## Conventions

- Validation lives in `packages/shared` (Zod). The API and the web both import
  the same schemas — never duplicate a shape locally.
- The API validates at the route boundary *and* in the service. Keep both.
- DB access only through Drizzle in `*.service.ts`. Routes stay thin.
- Migrations are generated (`pnpm db:generate`), never hand-edited.
- Tests: Vitest. API integration tests run against PGlite in memory.
- User-facing copy is in Catalan. Code, comments, commits, specs and issues in English.
