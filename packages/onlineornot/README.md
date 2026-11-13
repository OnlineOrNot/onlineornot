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

## Docs

There are docs for:

- [Installing and updating `onlineornot`](https://onlineornot.com/docs/cli-installation)
- [Logging in](https://onlineornot.com/docs/cli-login)
- [CLI Commands](https://onlineornot.com/docs/cli-commands)
