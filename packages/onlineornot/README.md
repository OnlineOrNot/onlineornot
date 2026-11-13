<h1 align="center"> ✅ onlineornot </h1>

`onlineornot` is a CLI for monitoring your uptime checks on [OnlineOrNot](https://onlineornot.com/).

**Table of Contents**

- [Quick Start](#quick-start)
- [Commands](#commands)
- [Docs](#docs)

## Quick Start

```bash
curl -fsSL https://onlineornot.com/install | bash
```

When run from a terminal, the installer asks you to choose Google or GitHub,
opens browser-based sign in or signup, and then asks for the URL of your first
uptime check. Passwords and social-provider credentials are entered only in the
browser.

Install from npm instead with `npm install -g onlineornot`, then run
`onlineornot setup`. For automation, use
`onlineornot setup --url https://example.com --name Example`.

## Commands

```bash
onlineornot

Commands:
  onlineornot docs     📚 Open OnlineOrNot's docs in your browser
  onlineornot checks   Manage checks
    onlineornot checks list         List one page of checks
    onlineornot checks get <id>     Retrieve any check as JSON
    onlineornot checks delete <id>  Delete a check with confirmation or --force
    onlineornot checks move <id>    Assign or unassign a check
    onlineornot checks http         Create, update, or inspect HTTP checks
    onlineornot checks browser      Create, update, or inspect browser checks
    onlineornot checks dns          Create, update, or inspect DNS checks
    onlineornot checks tcp          Create, update, or inspect TCP checks
  onlineornot billing  🧾 Open OnlineOrNot's billing in your browser
  onlineornot auth     Manage authentication
    onlineornot auth login   🔓 Login to OnlineOrNot via OAuth
    onlineornot auth logout  🔒 Logout from OnlineOrNot
    onlineornot auth whoami  🕵️  Retrieve your user info and test your auth config
  onlineornot setup    🚀 Sign in or sign up and create your first uptime check

Flags:
  -h, --help     Show help  [boolean]
  -v, --version  Show version number  [boolean]
```

Use `onlineornot auth login`, `onlineornot auth logout` and `onlineornot auth whoami` for authentication. The previous top-level `login`, `logout` and `whoami` commands remain available as hidden compatibility aliases. `onlineornot setup` remains the first-check onboarding command.

Resource commands output JSON without `--json`. For existing scripts, see the [major-release migration guide](https://github.com/OnlineOrNot/onlineornot/blob/main/BREAKING_CHANGES.md).

Find commands by task, partial names or typos:

```sh
onlineornot cli search "checks dns cre"
onlineornot cli search "hearbeats delet"
onlineornot cli search "signout"
```

Search returns up to five ranked JSON matches, including API commands and utilities. It runs locally without login or network access. Use `onlineornot cli commands` for the full API command catalog and append `--help` to a command for usage.

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

## Docs

There are docs for:

- [Installing and updating `onlineornot`](https://onlineornot.com/docs/cli-installation)
- [Logging in](https://onlineornot.com/docs/cli-login)
- [CLI Commands](https://onlineornot.com/docs/cli-commands)
