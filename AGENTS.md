# OnlineOrNot CLI Workspace

**Generated:** 2026-09-25 | **Commit:** 2125dc1 | **Branch:** main

## Overview

Two-package pnpm workspace: the `onlineornot` CLI and its generated
`@onlineornot/api` SDK. The CLI ships through npm and standalone Node SEA binaries.

## Structure

```text
onlineornot-cli/
├── packages/onlineornot/     # CLI, installer, standalone updater; AGENTS.md
├── packages/api/            # Generated SDK and optional validators; AGENTS.md
├── .github/                 # Release helpers and three workflows; AGENTS.md
├── .changeset/              # Package-scoped release notes
└── tools/oxlint/anti-slop/   # Vendored lint plugin; AGENTS.md
```

## Where to Look

| Task                                | Location                                             | Starting point                                  |
| ----------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Add commands or change CLI behavior | `packages/onlineornot/AGENTS.md`                     | Parser, handlers, auth, API adapters            |
| Change SDK surface or schema pin    | `packages/api/AGENTS.md`                             | Generation ownership and public export rules    |
| Change npm or binary releases       | `.github/AGENTS.md`                                  | Publishing, immutable tags, asset verification  |
| Change lint enforcement             | `.oxlintrc.json`, `tools/oxlint/anti-slop/AGENTS.md` | Enabled rules differ from available rules       |
| Change formatting                   | `.oxfmtrc.json`                                      | Tabs, double quotes, semicolons, sorted imports |
| Add a release note                  | `.changeset/`, `CONTRIBUTING.md`                     | Select affected package; `TYPE: TITLE` format   |

## Dependency and Toolchain Boundaries

- Build the SDK before the CLI: `onlineornot` depends on `@onlineornot/api`
  through `workspace:^`; root recursive builds respect that dependency.
- Install from this root with pnpm. CI uses pnpm 12; root development engines
  require Node >=22.15.0, while Volta pins 22.16.0.
- Published runtimes differ: CLI Node >=22, SDK Node >=18. SEA builds require
  Node >=25; release and preview workflows use Node 26.
- TypeScript is package-specific: root uses 7.x, SDK pins 5.9.3. Use package
  scripts rather than assuming one compiler/version for the entire tree.
- `CONTRIBUTING.md` still describes npm workspaces, ESLint, Prettier, and Jest.
  Current manifests and workflows are authoritative: pnpm, Oxlint, Oxfmt, Vitest.

## Commands

Run from this repository root:

```bash
pnpm install --frozen-lockfile
pnpm run build             # SDK, then CLI
pnpm run check             # Format, lint, package typechecks
pnpm run test:ci           # One-shot tests; run build first
pnpm changeset             # Release-worthy changes
```

- Root `test` cleans the CLI, builds packages, then runs package tests; the CLI's
  `test` invokes interactive Vitest. Prefer `test:ci` for unattended verification.
- SDK packaging tests inspect `dist/`; `test:ci` does not build it for you.
- `check` does not run SDK `check:generated`; consult the SDK guide before schema
  verification because that command regenerates tracked output.

## Project Conventions

- `.oxlintrc.json` loads the local anti-slop plugin. It rejects module mocking,
  chained assertions, unsafe widening, and other patterns beyond ordinary lint.
- Non-const type assertions require a nearby `SAFETY:` comment stating the
  checked invariant. Boundary exceptions use narrow, explained lint suppressions.
- Tests use injected dependencies, custom Fetch implementations, temporary
  files, and subprocess fixtures. CLI tests are colocated; SDK tests live in `test/`.
- Prefer E2E/integration verification for complex changes, with a repeatable
  artifact. Never add unit tests after writing implementation code.
- Keep generated SDK changes in the generation workflow; keep vendored lint
  changes traceable to the upstream provenance documented in its child guide.

## Release Notes

- Changesets track the two published packages independently. Include a changeset
  for changes intended for their changelogs.
- Main pushes run versioning/publication; pull requests and non-main pushes can
  publish previews. Read `.github/AGENTS.md` before changing those workflows.
- Local `build`, `check`, and `test:ci` are verification commands; publication,
  installer execution, and self-update/uninstall commands have external effects.
