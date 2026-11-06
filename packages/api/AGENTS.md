# Generated API SDK

Low-level Fetch-based ESM client with declarations and optional Zod/Valibot
entrypoints. CLI-specific authentication, errors, and pagination live in the CLI.

## Where to Look

| Task                                       | Location                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Public client/type exports                 | `src/index.ts`                                                                            |
| Optional validator exports                 | `src/zod.ts`, `src/valibot.ts`                                                            |
| Generator plugins and schema normalization | `openapi-ts.config.ts`                                                                    |
| Download/cache/digest verification         | `scripts/lib.mjs`                                                                         |
| Regenerate and enforce operation names     | `scripts/generate.mjs`                                                                    |
| Advance schema pin                         | `scripts/update-schema.mjs`, `schema.lock.json`                                           |
| Reviewed public operation snapshot         | `operations.json`                                                                         |
| Build entrypoints                          | `tsup.config.ts`                                                                          |
| Wire behavior, validation, packaging       | `test/client.test.ts`, `test/zod.test.ts`, `test/valibot.test.ts`, `test/package.test.ts` |

## Generation Boundary

- `src/generated/` is committed machine output. Change the schema pin or generator
  and regenerate rather than hand-editing generated files.
- The schema comes from `OnlineOrNot/api-schemas` at a full commit SHA, verified
  against the exact-byte SHA-256 in `schema.lock.json`. The sibling checkout is
  not an implicit input. Failed verification has no fallback URL.
- `openapi-ts.config.ts` requires `ONLINEORNOT_OPENAPI_PATH`; the wrapper provides
  a verified input. Use package scripts rather than calling the generator directly.
- The parser requires OpenAPI 3.1 and removes defaults from required properties
  in the schemas it visits, preserving required-input validation semantics.
- `generate.mjs` patches both heartbeat ping operations to `https://oonchk.com`
  because the pinned generator does not emit operation-level servers. Preserve
  its assertions when upgrading the generator.
- Normal generation rejects changes to the reviewed operation-name snapshot.
  `schema:update <full-commit-sha>` deliberately updates the lock, generated code,
  and snapshot together; review all three.
- **`check:generated` writes output first**, then uses `git diff --exit-code` on
  generated sources and `operations.json`. It is not a read-only check.

## Public Contract

- Preserve generated `{ data, error, request, response }` results and API wire
  envelopes. Do not add implicit pagination, unwrapping, or default throwing.
- Keep the root entrypoint runtime-dependency-free. Validators stay in `/zod`
  and `/valibot`; their peers are optional and absent from root imports.
- Operations accept isolated clients and request overrides. Heartbeat server
  overrides must still allow an explicit per-request `baseUrl`.
- Omitted request fields stay omitted; the SDK does not supply API defaults.

## Commands

From the repository root:

```bash
pnpm --filter @onlineornot/api run build
pnpm --filter @onlineornot/api run check:type
pnpm --filter @onlineornot/api run test:ci
pnpm --filter @onlineornot/api run generate
pnpm --filter @onlineornot/api run check:generated
```

Generation needs network access or the verified cache. Packaging tests import
built entrypoints and inspect an npm dry-run pack; they also guard validator
isolation and prevent schema/cache/credential files from entering the package.
