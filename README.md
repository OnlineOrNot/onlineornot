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

## TypeScript API SDK

The independently versioned [`@onlineornot/api`](./packages/api) workspace package provides a low-level generated TypeScript client for the OnlineOrNot REST API. The CLI uses its generated operations through a small adapter that supplies CLI authentication, logging, error handling, and pagination.
