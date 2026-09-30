# Heartbeat management (experimental)

```sh
onlineornot heartbeats list --page 2 --per-page 20 --json
onlineornot heartbeats view a1b2c3d4 --json
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

- Body input is **one JSON file or stdin (`--input -`) only**. Repeated `--input`
  options, unknown properties, and body flags are rejected. There is no merge
  precedence because there are no individual body flags. Input is never echoed.
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

`pnpm --filter onlineornot generate:heartbeats` runs at CLI build time. It uses
`packages/api/schema.lock.json` and the SDK's verified cache/downloader, checks
the full commit and exact-byte SHA-256, and checks the SDK operation snapshot.
There is no runtime schema download and no generated SDK editing.

The reviewed operationId-keyed `scripts/heartbeats-overlay.json` controls command
paths, argument mappings, JSON-only input, envelope output, pagination and safety.
Every operation must have a classification and reason. New unclassified
operations fail generation; ping operations are explicitly excluded. The
emitter deliberately supports only the heartbeat contract's input primitives
and rejects unsupported schema constraints rather than becoming a general
OpenAPI framework. Unknown body properties are rejected as a CLI safety policy.

```sh
pnpm run build
pnpm --filter onlineornot check:generated
pnpm --filter onlineornot test:heartbeats
HEARTBEAT_EVIDENCE=/absolute/private/path/heartbeat-verification.json pnpm --filter onlineornot test:heartbeats
```

The subprocess suite bundles the real CLI entrypoint with only its API origin
replaced by an ephemeral loopback fixture. It uses isolated configuration and a
fake token, not production. The optional evidence JSON records sanitized fixture
requests (no authorization header), stdout/stderr/exit assertions, help output,
and the command manifest/schema identity. Share it only through trusted channels.
`test/heartbeats-compatibility.json` separately snapshots the reviewed CLI syntax.
The generation test checks repeatability and rejects missing coverage decisions.
Existing check defaults and handwritten auth/setup/check commands are unchanged.
