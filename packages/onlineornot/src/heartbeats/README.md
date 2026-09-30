# Heartbeat management (experimental)

```sh
onlineornot heartbeats list --page 2 --per-page 20 --json
onlineornot heartbeats view a1b2c3d4 --json
onlineornot heartbeats create --name "Daily backup" --grace-period 300 --report-period 86400
onlineornot heartbeats update a1b2c3d4 --no-paused --clear-report-period
onlineornot heartbeats update a1b2c3d4 --user-alerts alice --user-alerts bob
onlineornot heartbeats update a1b2c3d4 --clear-user-alerts --json
onlineornot heartbeats create --input heartbeat.json --json
printf '%s' '{"paused":false,"report_period":null}' | onlineornot heartbeats update a1b2c3d4 --input - --json
onlineornot heartbeats delete a1b2c3d4 --yes --json
onlineornot heartbeats commands --json
```

`heartbeat.json` can contain `{"name":"Daily backup","grace_period":300}`.
Create requires `name` and `grace_period`; scheduling requirements beyond the
pinned contract are enforced by the API. The `commands` output includes the
complete pinned body contracts, command metadata, schema identity, and operation
coverage decisions. `--help` describes each command's arguments.

## Input, output, and safety

- **Start with flags**: `--name`, `--grace-period`, `--alert-priority HIGH`, etc.
  Flag names are kebab-case; requests retain the schema's snake_case field names.
  `--help` lists types, descriptions, enum choices, required fields and examples.
  Create requires `--name` and `--grace-period`, unless provided in JSON input.
  Missing/invalid fields fail before authentication or network requests with a
  field-specific message (e.g. `--grace-period ... expected an integer >= 1`).
- Booleans use `--paused` / `--no-paused` (or `--paused=false`). Leaving the flag
  out leaves the field unchanged; no implicit `false` is sent.
- Arrays use repeated flags: `--user-alerts alice --user-alerts bob`. Empty arrays
  use `--clear-user-alerts`. One value is required per occurrence; use JSON input
  for array values that are awkward to quote in a shell.
- Nullable fields use `--clear-report-period`, `--clear-report-period-cron`, and
  `--clear-timezone` to send JSON `null`. `--timezone null` sends the literal string
  `"null"`, not null. `--name ''` sends an empty string. A clearing flag conflicts
  with the corresponding value flag; omit a clearing flag instead of setting it
  to false.
- **Optional JSON escape hatch**: one `--input file.json` or `--input -` for stdin.
  JSON must use API field names and is validated against the same contract.
  JSON and body flags (including negation/clearing) **cannot be mixed**; there is
  no merge precedence. Repeated `--input`, unknown JSON fields, and repeated
  scalar flags are rejected. Malformed JSON values are not echoed. UTF-8 stdin
  is decoded across chunk boundaries.
- No optional API defaults are injected. PATCH preserves omission, `false`, zero
  where permitted (e.g. `reminder_alert_interval_minutes`), empty strings/arrays,
  and `null` for `report_period`, `report_period_cron`, and `timezone`. Invalid
  zero intervals or null booleans are rejected before authentication or requests.
- List makes exactly one request. Omitted page/per-page values are left to the
  API. There is no automatic all-pages mode, search flag, or ping command.
- Delete always requires `--yes`, in a terminal and in scripts. It never prompts.
- Successful CRUD output is one full API envelope, including list `result_info`.
  Without `--json`, an experimental warning goes to stderr; stdout remains JSON.
  With `--json`, successful stderr is empty. Failures have empty stdout, an error
  on stderr, and nonzero exit. Debug response logging is disabled for this family
  because resource responses can include sensitive heartbeat URLs. JSON output
  deliberately retains those API fields: treat saved output as sensitive.
- Existing token selection and OAuth refresh are reused. API token permissions
  still apply. Multi-organization OAuth selection is not exposed by this pilot.

## Generation and verification

`pnpm --filter onlineornot generate:cli` runs at CLI build time. It uses
`packages/api/schema.lock.json` and the SDK's verified cache/downloader, checks
the full commit and exact-byte SHA-256, and checks the SDK operation snapshot.
There is no runtime schema download and no generated SDK editing.

The generic `scripts/generate-cli.mjs` reads the reviewed `scripts/cli-overlay.json`.
Its `resources` section supplies resource names/help; its operationId-keyed
`operations` section controls classification, command paths, argument mappings,
exclusive flags-or-JSON input, envelope output, pagination and safety. Generated operations
are grouped by their configured resource. SDK calls and body type imports come
from operation IDs, not a hardcoded heartbeat list. Body flags, clearing options,
validators and help/examples derive from the pinned schema; the parser and
command manifest share that generated metadata.

Output is `src/generated-cli/<resource>.ts`, a matching `.manifest.json`, and
an `index.ts` registry consumed by the existing CLI parser. Shared input/auth
helpers live in `src/cli-runtime.ts`. Only heartbeat CRUD is configured for
publication today; handwritten check/auth/setup commands remain unchanged.

Every operation must have a classification and reason. Unclassified operations
fail generation; ping remains explicitly excluded. A new resource using the
supported string/integer/boolean/nullable/array body primitives can be configured
without changing the emitter. Unsupported schema constraints, body references,
and complex object shapes fail closed; this is not a universal OpenAPI resolver.
Unknown body properties are rejected as a CLI safety policy. Every deletion
requires `--yes`, and no generated command injects API defaults.

```sh
pnpm run build
pnpm --filter onlineornot check:generated
pnpm --filter onlineornot test:cli
HEARTBEAT_EVIDENCE=/absolute/private/path/heartbeat-verification.json pnpm --filter onlineornot test:cli
```

The subprocess suite bundles the real CLI entrypoint with only its API origin
replaced by an ephemeral loopback fixture. It uses isolated configuration and a
fake token, not production. The optional evidence JSON records sanitized fixture
requests (no authorization header), stdout/stderr/exit assertions, help output,
and the command manifest/schema identity. Share it only through trusted channels.
`test/heartbeats-compatibility.json` separately snapshots the reviewed CLI syntax.
`test/cli-generation.mjs` checks repeatability and missing coverage decisions.
It also temporarily configures status-page component-group create/delete commands,
generates them into an isolated directory (`--overlay` and `--output-dir`),
typechecks the SDK calls, and exercises flag-based creation, body validation, two path parameters,
and delete safety against a loopback fixture. Those commands are not shipped.
The fixture also confirms unsupported constraints still fail generation.
Existing check defaults and handwritten auth/setup/check commands are unchanged.

Dry-run is not included: request previews need an explicit secret-redaction
policy before broader resources are added. This slice prioritizes flags and help.
