# OnlineOrNot CLI

**Generated:** 2026-03-06 | **Commit:** 053e957 | **Branch:** main

## Overview

CLI for OnlineOrNot uptime monitoring service. pnpm monorepo with single package.

## Structure

```
onlineornot-cli/
├── packages/
│   └── onlineornot/          # Main CLI (npm: onlineornot) <- AGENTS.md
├── .changeset/               # Changesets version management
└── .github/workflows/        # CI/CD (2 workflows)
```

## Build/Test/Lint

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm run build` | Build CLI with esbuild               |
| `pnpm run check` | Format + lint + typecheck (parallel) |
| `pnpm run fix`   | Auto-fix lint + format issues        |
| `pnpm run test`  | (TODO) No tests implemented          |

## Where to Look

| Task          | Location                          | Notes                |
| ------------- | --------------------------------- | -------------------- |
| CLI commands  | `packages/onlineornot/src/`       | yargs-based commands |
| API client    | `packages/onlineornot/src/fetch/` | undici + pagination  |
| CI workflows  | `.github/workflows/`              | releases, previews   |
| Version bumps | `.changeset/`                     | Run `pnpm changeset` |

## Code Conventions

### Formatting

- **Tabs, not spaces** (`useTabs: true`, width 2)
- **Double quotes** (not single)
- **Semicolons required**

### TypeScript

- `strict: true` but `alwaysStrict: false` (prevents esbuild issues)
- `import type` enforced for type-only imports
- `@typescript-eslint/no-explicit-any: error`
- Unused vars allowed if prefixed with `_`

### Imports

- Alphabetized: `builtin > external > internal > parent > sibling`
- Unused imports auto-removed

## Anti-Patterns (THIS PROJECT)

### TypeScript Workarounds

- `packages/onlineornot/src/fetch/index.ts:126` - `@ts-expect-error` for non-standard Error.code
- `packages/onlineornot/src/index.ts:154` - yargs workaround: re-parse with `--help`

### Type Safety Gaps

- Multiple `as Type` casts bypass generic inference in fetch utilities
- `packages/onlineornot/src/logger.ts:37` - env var cast without runtime validation

### Unused Code

- `packages/onlineornot/src/errors.ts` - `DeprecationError` defined but never used

### Silent Failures

- `packages/onlineornot/src/update-check.ts:12-14` - update check errors ignored
- `packages/onlineornot/src/whoami.ts:45-48` - token validation returns null silently

## Release Process

1. Create changeset: `pnpm changeset`
2. Commit changeset file
3. Push to main - CI creates "Version Packages" PR
4. Merge PR - triggers npm publish (Trusted Publishing)

## CI Workflows

| Workflow          | Trigger            | Purpose                                             |
| ----------------- | ------------------ | --------------------------------------------------- |
| `release.yml`     | push to main       | Changesets versioning + npm publish with provenance |
| `prereleases.yml` | push, pull_request | Preview releases via pkg.pr.new                     |

## Non-Standard Patterns

- **Output dir**: `onlineornot-dist/` instead of `dist/`
- **Node version check**: `bin/onlineornot.js` spawns cli.js with `--experimental-vm-modules`
- **Preview releases**: Via pkg.pr.new (`npm i https://pkg.pr.new/onlineornot@<sha>`)

## Environment

- **Node**: >=22
- **pnpm**: 10
- **TypeScript**: 5.9
