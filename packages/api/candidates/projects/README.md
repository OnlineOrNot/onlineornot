# Projects candidate contract

**Unreleased preparation only.** This snapshot is not evidence of deployed
routes or a published schema/SDK version. Do not publish these packages until
server compatibility and the released schema pin have been reviewed.

`schema.candidate.lock.json` pins the exact bytes of `openapi.json`. While that
lock exists, normal generation and `check:generated` use this local candidate,
without downloading a schema. A missing or modified candidate fails closed.
`schema.lock.json` retains the previous released schema provenance; it does not
describe the candidate-generated sources. `operations.json` records the candidate
digest and 105 operations explicitly. The snapshot is excluded from package files.

The candidate adds project CRUD, check/heartbeat moves, optional `project_id` on
check/heartbeat/variable creation and listing, and ownership in resource responses.
Omitted creation selection means Default; omitted list filtering stays
organisation-wide. Project names are labels, not selectors. Ordinary resource
patches cannot change ownership. Variables cannot be moved.

Moves send one POST with only the destination `project_id`. The SDK preserves
wire envelopes and errors; it does not retry, copy variables, perform compensating
writes or activate resources. Atomicity, permissions, state/history preservation,
ping URL stability and consistent execution snapshots remain server obligations.
The client fixtures prove request behavior, not database transactions or rollout.

## Reproduce locally

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @onlineornot/api run generate
pnpm run build
pnpm run check
pnpm run test:ci
pnpm --filter @onlineornot/api run check:generated
```

`check:generated` compares with committed sources, so run it after committing the
reviewed generation result. No real API calls are required by the projects tests.

Test-first evidence: before generation, three of four SDK wire tests failed on
missing project/move exports, all three validator tests failed, and ten of thirteen
CLI fixture tests failed on missing commands/options. The remaining tests guarded
legacy omission and parser rejection. SDK build was required before CLI tests
could resolve the workspace package.

The fixtures cover project CRUD, selection/filter serialization and omission,
check/heartbeat single-request moves, conflict propagation without retry or
reactivation, required destinations, strict move bodies, and forbidden ordinary
ownership patches in both optional validator entrypoints. CLI tests exercise the
real parser, authentication adapter and SDK with a local custom Fetch function.

Generator compatibility is asserted in `scripts/candidate-compatibility.mjs`:
openapi-ts 0.99 does not emit `not: {}` as `never`, and its Zod output strips
additional properties instead of rejecting them. The generation workflow corrects
the seven resource update ownership fields and four strict project/move bodies;
unexpected output shapes fail generation rather than silently weakening them.

## Release gate

After server parity and rollout approval, remove the candidate lock, run
`pnpm --filter @onlineornot/api schema:update <released-full-commit-sha>`, review
all generated changes and operation names, and rerun verification. Remove the
candidate compatibility step only when equivalent constraints are retained.
Preview publication is skipped while the candidate lock exists, and the release
workflow fails closed before release mutations. Package publication, deployment
and migrations require separate human approval.

## Local verification result

The candidate build, both package typechecks, lint and all 135 tests pass
(48 SDK, 87 CLI). The CLI fixture suite includes 15 parser/request scenarios.
The publication guard was also tested red before implementation. A root format
check can include unrelated local workspace edits; the committed candidate
snapshot is deliberately excluded from formatting to preserve its pinned bytes.

Check runtime selection now scopes `--version` to the command instead of the
root CLI-version boolean. The obsolete `NODE20_PLAYWRIGHT` update value is
rejected before network access with guidance to use `NODE24_PLAYWRIGHT`, matching
the current API contract. Both rejection and supported-value serialization were
tested before that parser correction.
