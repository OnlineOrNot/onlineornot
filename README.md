<h1 align="center"> ✅ onlineornot </h1>

`onlineornot` is a CLI for monitoring your uptime checks on [OnlineOrNot](https://onlineornot.com/).

## Authentication

To login, you'll need create an environment variable named `ONLINEORNOT_API_TOKEN`, and set it to an OnlineOrNot API token, which you can find [here](https://onlineornot.com/app/settings/developers).

For example:

```bash
export ONLINEORNOT_API_TOKEN=token-goes-here
npx onlineornot whoami
```

If your token is valid, you should see:

```bash
 ✅ onlineornot 0.0.10
----------------------
Getting User settings...
👋 You are logged in with an API Token.
```

## Quick Start

Once you've authenticated, you can run commands:

```
npx onlineornot checks
```
