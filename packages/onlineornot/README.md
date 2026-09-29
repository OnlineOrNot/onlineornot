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
  onlineornot checks   ✅ Manage your uptime checks
    onlineornot checks list                 List uptime checks
    onlineornot checks view <id>            View a specific uptime check
    onlineornot checks create <name> <url>  Create a new uptime check
    onlineornot checks delete <id>          Delete a specific uptime check
  onlineornot billing  🧾 Open OnlineOrNot's billing in your browser
  onlineornot login    🔓 Login to OnlineOrNot via OAuth
  onlineornot setup    🚀 Sign in or sign up and create your first uptime check
  onlineornot whoami   🕵️  Retrieve your user info and test your auth config

Flags:
  -h, --help     Show help  [boolean]
  -v, --version  Show version number  [boolean]
```

## Docs

There are docs for:

- [Installing and updating `onlineornot`](https://onlineornot.com/docs/cli-installation)
- [Logging in](https://onlineornot.com/docs/cli-login)
- [CLI Commands](https://onlineornot.com/docs/cli-commands)

## Projects (unreleased candidate)

These commands require a server supporting the candidate projects API. They are
preparation only, not a claim of availability in a published CLI or deployed API.
Select projects by encoded ID, never by display name.

```sh
onlineornot projects list --json
onlineornot projects create staging --json
onlineornot projects view <project-id> --json
onlineornot projects update <project-id> --name staging-renamed --json
onlineornot projects delete <project-id> --json
onlineornot checks create Website https://example.com --project-id <project-id> --json
onlineornot checks list --project-id <project-id> --json
onlineornot checks move <check-id> --project-id <destination-project-id> --json
onlineornot heartbeats move <heartbeat-id> --project-id <destination-project-id> --json
```

Omit `--project-id` on creation to select Default; omit it on listing to keep
organisation-wide results. Ordinary `checks update` does not accept ownership
changes. Default and nonempty projects cannot be deleted. The server enforces
permissions and destination variable compatibility. A move sends exactly one
request, preserving identity, running/paused state and heartbeat ping behavior;
there is no follow-up activation or automatic retry. Failure leaves the server
responsible for atomic rejection. Heartbeat CRUD and variable commands are not
introduced here; their project-aware APIs are available through the SDK.

See the [candidate verification notes](../api/candidates/projects/README.md) for
local proof and the separate release gates.
