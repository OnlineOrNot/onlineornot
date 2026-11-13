<h1 align="center"> ✅ onlineornot </h1>

`onlineornot` is the command-line interface for [OnlineOrNot](https://onlineornot.com/).
Manage HTTP, browser, DNS and TCP checks, heartbeats, status pages and more from your terminal or CI.

**Upgrading from v1?** v2 introduces typed check commands and JSON output, explicit
pagination and safer deletion. Read [Upgrading from v1](#upgrading-from-v1) before
updating existing scripts.

**Table of Contents**

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Commands](#commands)
- [Working with checks](#working-with-checks)
- [Scripting and CI](#scripting-and-ci)
- [Webhook diagnostics, audit history and project moves](#webhook-diagnostics-audit-history-and-project-moves)
- [MCP clients](#mcp-clients)
- [Updating](#updating)
- [Upgrading from v1](#upgrading-from-v1)
- [Docs](#docs)
- [TypeScript API SDK](#typescript-api-sdk)

## Quick Start

Install the standalone CLI (no Node.js installation required):

```sh
curl -fsSL https://onlineornot.com/install | bash
```

When run from a terminal, the installer asks you to choose Google or GitHub,
opens browser-based sign in or signup, and then asks for the URL of your first
uptime check. Passwords and social-provider credentials are entered only in the
browser.

Or install from npm with **Node.js 22 or later**, then run first-check setup:

```sh
npm install -g onlineornot
onlineornot setup
```

Already have an account and checks? Run `onlineornot auth login`, then
`onlineornot checks list`.

## Authentication

```sh
onlineornot auth login
onlineornot auth whoami
onlineornot auth logout
```

Browser-based OAuth stores credentials locally and refreshes them automatically.
The previous top-level `login`, `logout` and `whoami` commands remain hidden
compatibility aliases; use the `auth` commands in new scripts.

For CI or other non-interactive use, set `ONLINEORNOT_API_TOKEN` through your
secret manager or CI environment. It takes precedence over saved OAuth
credentials. Never commit tokens to source control.

API commands accept `--organisation <organisation-id>` when an OAuth grant
authorizes multiple organizations. Omit it for single-organization grants and API
tokens.

## Commands

| Command group    | What it manages                                                                    |
| ---------------- | ---------------------------------------------------------------------------------- |
| `checks`         | HTTP, browser, DNS and TCP checks, results and incidents                           |
| `heartbeats`     | Heartbeat monitoring                                                               |
| `status-pages`   | Status pages, components, groups, incidents, scheduled maintenance and subscribers |
| `webhooks`       | Webhooks and delivery diagnostics                                                  |
| `env`            | Environment variables (`environment-variables` is an alias)                        |
| `maintenance`    | Maintenance windows (`maintenance-windows` is an alias)                            |
| `projects`       | Projects for organizing resources                                                  |
| `resources move` | Atomic bulk moves between projects                                                 |
| `tokens`         | API tokens                                                                         |
| `audit-logs`     | Organization audit history                                                         |

Use `auth` for authentication, `setup` for first-check onboarding, `docs` and
`billing` to open those pages, and `update` or `uninstall` for standalone installs.
Use `mcp` to connect an MCP client.

Discover commands and flags locally, without logging in or making API requests:

```sh
onlineornot --help
onlineornot checks http create --help
onlineornot cli commands
onlineornot cli search "checks dns cre"
onlineornot cli search "hearbeats delet"
onlineornot cli search "signout"
```

`cli commands` prints the full generated API command catalog as JSON. Search
matches tasks, partial names and typos, returning up to five ranked JSON matches
across API commands and utilities. Append `--help` to any command for usage.

## Working with checks

Choose a type when creating or updating a check:

```sh
onlineornot checks http create --name "Homepage" --url "https://example.com"
onlineornot checks browser create --name "Browser" --url "https://example.com"
onlineornot checks dns create --name "Domain" --domain "example.com" --record-type A
onlineornot checks tcp create --name "HTTPS port" --hostname "example.com" --port 443
onlineornot checks http update <check-id> --name "Homepage API"
```

List, retrieve, delete and move commands are shared across check types:

```sh
onlineornot checks list --page 1 --per-page 20
onlineornot checks get <check-id>
onlineornot checks move <check-id> --project-id <project-id>
onlineornot checks delete <check-id>
```

Use `checks http|browser|dns|tcp results` or `incidents` with a check ID to inspect
results and incident history, for example:

```sh
onlineornot checks http results <check-id> --help
```

## Scripting and CI

- Resource commands write JSON to stdout without `--json`. Diagnostics and
  pagination metadata go to stderr; failures exit nonzero.
- Lists return **one page per request**, not every resource. Numbered lists use
  `--page` and `--per-page` (defaults: 1 and 20). Continue until the accumulated
  count reaches `result_info.total_count` or a page is empty. Cursor-based lists
  use the cursor returned in their JSON result.
- Deletion and bulk moves ask for confirmation in a terminal. Non-interactive
  execution requires `--force`; cancellation exits nonzero without an API request.
- API commands support `--dry-run` to validate and preview a request locally,
  without credentials or HTTP. This does not check server-side permissions or
  conflicts.
- Create and update commands accept individual body-field flags **or** `--body`
  with an inline JSON object, `@file.json`, or `-` for stdin. Do not mix both forms.
  JSON uses API field names such as `project_id`; flags use `--project-id`.
- `--http-body` is the payload sent by an HTTP or browser check; `--body` is the
  complete API request. Updates must supply at least one body field.

```sh
# Save JSON separately from diagnostics.
onlineornot checks list --page 1 --per-page 100 > checks.json

# Validate a request without creating a check.
onlineornot checks http create --body '{"name":"Homepage","url":"https://example.com"}' --dry-run

# Read a complete API request from a file or stdin.
onlineornot checks browser create --body @browser.json
cat check.json | onlineornot checks http create --body -

# Delete without prompting (requires authentication).
onlineornot checks delete <check-id> --force
```

## Webhook diagnostics, audit history and project moves

```sh
onlineornot webhooks deliveries list <webhook-id> --period 7d --outcome timeout --limit 25
onlineornot webhooks deliveries get <webhook-id> <attempt-id>
onlineornot webhooks deliveries activity <webhook-id> --period 14d
onlineornot webhooks deliveries summary --webhook-ids <id1,id2>
onlineornot audit-logs list --page 1 --per-page 20
onlineornot resources move --body @move.json --dry-run
onlineornot resources move --body @move.json --force
```

Webhook diagnostics require `WEBHOOKS:READ`. Delivery lists accept `--period 24h|7d|14d` (default `24h`), `--event-type`, `--outcome`, `--limit` (1–100, default 25) and `--cursor`. Request the next page explicitly using `next_cursor` from the JSON result. Activity supports the same periods; summaries cover the last 24 hours for comma-separated webhook IDs. Delivery detail includes captured headers and payloads with their capture/truncation markers; keep this output private. Debug logs do not include the delivery-detail response body.

Audit history requires `PEOPLE:READ` and returns one page per request, with pagination metadata on stderr. All six commands accept `--organisation` where an OAuth grant authorizes multiple organizations.

A bulk-move body selects the destination and exact resources:

```json
{
	"project_id": "<destination-project-id>",
	"resources": [
		{ "kind": "check", "id": "<check-id>" },
		{ "kind": "environment_variable", "id": "<variable-id>" }
	]
}
```

Set `project_id` to `null` to unassign. Select 1–100 checks, heartbeats, webhooks, environment variables or maintenance windows using the API kinds `check`, `heartbeat`, `webhook`, `environment_variable` and `maintenance_window`. JSON can be inline, `@file.json` or stdin (`--body -`); alternatively use `--project-id` and a JSON array in `--resources`.

Bulk moves use one atomic request: the server rejects conflicts or invalid dependencies without partial changes. They require `PROJECTS:EDIT` and edit permission for every selected resource type. Interactive execution asks for confirmation; scripts and CI must use `--force`. `--force` only skips confirmation, not server checks. `--dry-run` validates and previews the request without credentials or HTTP; it does not check server-side conflicts or permissions.

## MCP clients

The CLI can bridge an MCP client's stdio connection to OnlineOrNot's hosted MCP
server using your CLI authentication. Sign in first with `onlineornot auth login`,
then add the following to your client's MCP server configuration (the exact file
location depends on the client):

```json
{
	"mcpServers": {
		"onlineornot": {
			"command": "onlineornot",
			"args": ["mcp"]
		}
	}
}
```

Make sure `onlineornot` is on the MCP client's `PATH`. No token needs to be embedded
in this configuration.

## Updating

For standalone installs:

```sh
onlineornot update --check
onlineornot update
```

For npm installs:

```sh
npm install -g onlineornot@latest
```

## Upgrading from v1

v2 removes the legacy `checks create`, `checks update` and `checks view` commands;
there are no compatibility aliases for these commands.

| v1                                               | v2                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `checks create "Homepage" "https://example.com"` | `checks http create --name "Homepage" --url "https://example.com"`    |
| `checks update <id> --name "Homepage"`           | `checks http update <id> --name "Homepage"` (choose the check's type) |
| `checks view <id>`                               | `checks get <id>`                                                     |
| `checks list --json`                             | `checks list --page 1 --per-page 20` (JSON is always returned)        |
| `checks delete <id> --json`                      | `checks delete <id> --force` for unattended scripts                   |
| `--body` for a monitored HTTP payload            | `--http-body`; `--body` now means the complete API request            |
| Repeated `--header "Key: Value"`                 | `--headers '{"Key":"Value"}'`                                         |
| `--version` for the browser runtime              | `--runtime NODE24_PLAYWRIGHT`                                         |

Creation uses API defaults. In particular, HTTP checks now default to `HIGH` alert
priority and enabled TLS verification. Review the
[full v2 migration guide](BREAKING_CHANGES.md) for pagination, validation, defaults
and flag changes before upgrading automation.

## Docs

- [Installing and updating `onlineornot`](https://onlineornot.com/docs/cli-installation)
- [Logging in](https://onlineornot.com/docs/cli-login)
- [CLI Commands](https://onlineornot.com/docs/cli-commands)
- [v2 migration guide](BREAKING_CHANGES.md)

## TypeScript API SDK

The independently versioned [`@onlineornot/api`](./packages/api) workspace package
provides a low-level generated TypeScript client for the OnlineOrNot REST API.
Install it separately with `npm install @onlineornot/api`. The CLI uses this SDK
for API operations; using the CLI does not require writing TypeScript.
