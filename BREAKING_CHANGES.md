# Breaking changes

## Next major release

All changes below are included in the next major CLI release. Existing scripts must migrate before upgrading.

### Choose a type when creating or updating checks

Remove `onlineornot checks create <name> <url>` and `onlineornot checks update <id>`. There is no default-type fallback or compatibility alias. Choose HTTP, browser, DNS or TCP and pass fields as flags or API request JSON.

Before:

```sh
onlineornot checks create "Homepage" "https://example.com" --json
onlineornot checks update check1234 --name "Homepage" --json
```

After:

```sh
onlineornot checks http create --name "Homepage" --url "https://example.com"
onlineornot checks browser create --name "Homepage" --url "https://example.com"
onlineornot checks dns create --name "Domain" --domain "example.com" --record-type A
onlineornot checks tcp create --name "HTTPS port" --hostname "example.com" --port 443
onlineornot checks http update check1234 --name "Homepage"
onlineornot checks browser update check1234 --name "Homepage"
onlineornot checks dns update check1234 --domain "example.net"
onlineornot checks tcp update check1234 --port 8443
```

Choose one command for the intended check type. The typed commands do not accept `--type`. Use `checks browser create --body @browser.json` for a JSON request containing a Playwright script.

### Replace view with get

Remove `checks view <id>`. Use `checks get <id>` for any check type, including DNS and TCP. The response is JSON rather than formatted details.

Before:

```sh
onlineornot checks view check1234 --json
```

After:

```sh
onlineornot checks get check1234
```

### Separate API JSON from the monitored HTTP payload

For typed create and update commands, `--body` accepts the complete API request as an inline JSON object, `@file.json`, or `-` for stdin. Use `--http-body` for the payload sent by the HTTP or browser check. Do not combine API JSON input with individual body-field flags.

Before:

```sh
onlineornot checks create "API" "https://example.com" --method POST --body '{"ping":true}' --json
onlineornot checks update check1234 --method POST --body '{"ping":true}' --json
```

After:

```sh
onlineornot checks http create --name "API" --url "https://example.com" --method POST --http-body '{"ping":true}'
onlineornot checks http update check1234 --method POST --http-body '{"ping":true}'
```

The equivalent API JSON contains a `body` property:

```sh
onlineornot checks http create --body '{"name":"API","url":"https://example.com","method":"POST","body":"{\"ping\":true}"}'
```

### Creation flags and defaults

- Replace repeated `--header "Key: Value"` arguments with `--headers '{"Key":"Value"}'` on typed commands.
- Use `--runtime NODE24_PLAYWRIGHT`, not `--version`, for the browser runtime.
- Omitted fields use API defaults. In particular, HTTP check creation defaults to `HIGH` alert priority and enabled TLS verification, rather than the removed command's `LOW` priority and disabled TLS verification. Pass `--alert-priority LOW` or `--no-verify-ssl` explicitly only when that behavior is intended.

### Consume JSON and request each list page explicitly

Check resource commands return JSON on stdout without banners or tables. Remove `--json`; it is no longer accepted. Successful deletion returns the API's JSON result rather than a formatted success message. Diagnostics and pagination metadata go to stderr.

`checks list` returns one page, not every check. Omitted pagination uses the API defaults: page 1 and 20 items per page. Use `--page` and `--per-page` to request subsequent pages. There is no automatic all-pages mode. Continue until the accumulated item count reaches `result_info.total_count` or a page is empty. Pagination metadata is emitted on stderr as `result_info: {"page":...,"per_page":...,"count":...,"total_count":...}`; stdout remains the JSON array of checks.

Before:

```sh
onlineornot checks list --json
```

After:

```sh
onlineornot checks list --page 1 --per-page 100
onlineornot checks list --page 2 --per-page 100
```

The new list command also supports `--search`, `--filter`, repeated `--project-id`, and `--organisation`. Separate stdout from stderr when saving or piping JSON. Check result-window commands retain pagination inside their JSON result as supplied by the API; incident-list pagination is emitted on stderr.

### Confirm check deletion

`checks delete <id>` asks for confirmation when stdin and stderr are terminals. Non-interactive execution and CI require `--force`. Rejection or cancellation sends no API request and exits nonzero. `--dry-run` previews deletion without confirmation, credentials or an API request.

Before:

```sh
onlineornot checks delete check1234 --json
```

After, for unattended scripts:

```sh
onlineornot checks delete check1234 --force
```

### Treat failures as failures and supply an update field

Validation, authentication and API failures exit nonzero. Scripts must check the exit status rather than treating an error message as a successful command. This includes API failure envelopes returned with HTTP 200.

Updates require at least one body field. An update with no fields or `--body '{}'` fails before authentication or HTTP, including when the empty JSON comes from a file or stdin. An organization selector alone is not an update. This applies to generated resource updates, not just checks.

Explicit values are preserved where the API schema accepts them: `false`, `null`, `0`, empty strings, empty objects and empty arrays are not omitted. Omitted fields are not sent as default values. For example:

```sh
onlineornot checks http update check1234 --no-muted --confirmation-period-seconds 0 --http-body ""
onlineornot checks dns update check1234 --body '{"dns_resolver":null,"assertions":[]}'
```

### Unchanged

Authentication flows, first-check setup, the TypeScript SDK and the public API are unchanged. `checks list`, `checks get`, `checks delete` and `checks move` remain shared across check types. The `env` / `environment-variables` and `maintenance` / `maintenance-windows` aliases remain available; `status-pages` remains explicit.
