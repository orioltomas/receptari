# Specs

One file per defined task, produced by the `grilling` skill.

`NNN-slug.md` — a spec. Its `status` frontmatter drives the workflow:

- `draft` — still has open questions for the owner.
- `ready` — fully defined; can be split with `/spec-to-issues`.
- `in-progress` — GitHub issues created and being worked on.

When every issue of a spec is closed, **delete the spec file**. The shipped code
is the source of truth, the git history keeps the spec, and durable business
decisions already live in `hard-rules.md`. This folder holds pending work only,
not a graveyard.

Never start implementing from a `draft` spec.
