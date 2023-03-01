<h1 align="center"> ✅ onlineornot </h1>

`onlineornot` is a CLI for monitoring your uptime checks on [OnlineOrNot](https://onlineornot.com/).

**Table of Contents**

- [Quick Start](#quick-start)
- [Commands](#commands)
- [Docs](#docs)

## Quick Start

```
npm i -g onlineornot
onlineornot login
export ONLINEORNOT_API_TOKEN=api-token-goes-here
onlineornot checks list
```

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
  onlineornot login    🔓 Open OnlineOrNot's Developer Portal in your browser
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
