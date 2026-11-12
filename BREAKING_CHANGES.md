# Breaking changes

## Next major release

### Replace untyped check creation

Status: Included in the next major CLI release.

Remove `onlineornot checks create <name> <url>`. There is no default-type fallback or compatibility alias. Existing scripts must choose a check type and pass the name and target as flags or API request JSON.

Before:

```sh
onlineornot checks create "Homepage" "https://example.com" --json
```

After:

```sh
onlineornot checks http create --name "Homepage" --url "https://example.com"
onlineornot checks browser create --name "Homepage" --url "https://example.com"
onlineornot checks dns create --name "Domain" --domain "example.com" --record-type A
onlineornot checks tcp create --name "HTTPS port" --hostname "example.com" --port 443
```

Choose one command for the intended check type. The new commands return JSON by default and do not accept `--json` or `--type`. Use `checks browser create --body @browser.json` for a JSON request containing a Playwright script.

### Separate API JSON from the monitored HTTP payload

For new type-specific commands, `--body` accepts the complete API request as an inline JSON object, `@file.json`, or `-` for stdin. Use `--http-body` for the payload sent by the HTTP or browser check. Do not combine API JSON input with individual body-field flags.

Before:

```sh
onlineornot checks create "API" "https://example.com" --method POST --body '{"ping":true}' --json
```

After:

```sh
onlineornot checks http create --name "API" --url "https://example.com" --method POST --http-body '{"ping":true}'
```

The equivalent API JSON contains a `body` property:

```sh
onlineornot checks http create --body '{"name":"API","url":"https://example.com","method":"POST","body":"{\"ping\":true}"}'
```

### Creation flags and defaults

- Replace repeated `--header "Key: Value"` arguments with `--headers '{"Key":"Value"}'` on new commands.
- Use `--runtime NODE24_PLAYWRIGHT`, not `--version`, for the browser runtime.
- Omitted fields use API defaults. In particular, HTTP check creation defaults to `HIGH` alert priority and enabled TLS verification, rather than the removed command's `LOW` priority and disabled TLS verification. Pass `--alert-priority LOW` or `--no-verify-ssl` explicitly only when that behavior is intended.
- Scripts using the old command's formatted output must consume the new JSON output.
- Invalid input, authentication failures and API failures exit nonzero on new commands.

### Commands retained

`checks list`, `checks view`, `checks update` and `checks delete` retain their existing flags, output and behavior. In particular, the legacy `checks update --body` flag still means the monitored HTTP payload. `checks get <id>` is a new JSON lookup that supports all check types; it does not replace `checks view` in this release.

## Candidates not approved for implementation

| Candidate                                                                | Migration needed                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Remove `checks view` in favour of `checks get`                           | Update command names and consume JSON instead of formatted details.                                  |
| Remove untyped `checks update`                                           | Choose `checks http update` or `checks browser update`; use `--http-body` for the monitored payload. |
| Make legacy commands JSON-only                                           | Remove `--json` and update scripts that parse tables or formatted messages.                          |
| Replace automatic all-page `checks list` output with explicit pagination | Add a deliberate all-pages option or require callers to follow pagination metadata.                  |
| Require confirmation or `--force` for legacy check deletion              | Update unattended deletion scripts before enabling the confirmation gate.                            |
| Standardize legacy error exit codes and validation                       | Audit scripts that currently treat logged errors as successful exits.                                |

These candidates are not part of the approved removal of untyped creation.
