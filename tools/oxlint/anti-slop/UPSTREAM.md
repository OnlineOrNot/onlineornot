# Upstream provenance

- Source: https://github.com/dmmulroy/anti-slop
- Commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`
- Source path: `skills/install-anti-slop/assets/anti-slop`
- Installed paths: `tools/oxlint/anti-slop/index.ts` and `tools/oxlint/anti-slop/effect/index.ts`
- Snapshot date: 2026-09-18

## Intentional deviations

- `package.json` remains repository-local and only marks the vendored plugin as a private ES module.
- The optional Effect plugin is not registered because this repository has no direct `effect` dependency.
- `no-array-filter-map` and `require-readable-spacing` are available but not enabled pending dedicated semantic and formatting migrations.
