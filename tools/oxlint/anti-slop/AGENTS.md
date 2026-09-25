# Vendored Anti-Slop Rules

Repository-local snapshot of `dmmulroy/anti-slop`, adapted for Oxlint through
`@oxlint/plugins`. This directory is tooling, not a published workspace package.

## Where to Look

| Task | Location |
| --- | --- |
| Source commit and intentional deviations | `UPSTREAM.md` |
| Generic plugin registration | `index.ts` |
| Generic rule implementations | `rules/` |
| AST, scope, type-alias helpers | `shared/` |
| Optional Effect plugin | `effect/index.ts`, `effect/rules/`, `effect/shared/` |
| Third-party spacing implementation | `vendor/eslint-stylistic/` |
| Rules actually enforced on this repository | Root `.oxlintrc.json` |

## Maintenance Boundary

- Read `UPSTREAM.md` before modifying or replacing this snapshot. Record local
  deviations there; preserve vendor licenses and nested provenance on refresh.
- Exporting a rule from `index.ts` does not enable it. Root lint configuration
  owns enforcement; check both places when investigating missing diagnostics.
- `no-array-filter-map` and `require-readable-spacing` are available but disabled
  pending dedicated migrations. The Effect plugin is unregistered because this
  repository has no direct Effect dependency.
- Root formatter and linter deliberately ignore this subtree. Preserve upstream
  formatting; a passing root check does not validate rule implementation changes.
- `package.json` is only the private ESM marker for the local plugin, not an
  independently versioned or released package.
- Rules use `defineRule`; plugin entrypoints use `eslintCompatPlugin`. Reuse the
  scope/type-resolution helpers for AST reasoning instead of duplicating them.

## Verification

Exercise changed rules through the root Oxlint configuration and focused fixture
inputs. This subtree has no package test script; recursive workspace tests do not
provide a dedicated rule suite. Keep activation changes separate from an upstream
snapshot refresh so their effects can be reviewed.
