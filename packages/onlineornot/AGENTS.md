# OnlineOrNot CLI Package

Main CLI for OnlineOrNot uptime monitoring. Published to npm as `onlineornot`.

## Structure

```
packages/onlineornot/
├── bin/onlineornot.js        # Entry: Node wrapper with version check
├── src/
│   ├── cli.ts                # Bundle entry -> calls main()
│   ├── index.ts              # CLI parser (yargs setup)
│   ├── checks/               # onlineornot checks <cmd>
│   ├── fetch/                # API client + pagination
│   ├── user/                 # Token management
│   └── environment-variables/ # ONLINEORNOT_API_TOKEN parsing
├── scripts/bundle.ts         # esbuild bundler
└── onlineornot-dist/         # Build output (CJS)
```

## Where to Look

| Task             | Location                                            |
| ---------------- | --------------------------------------------------- |
| Add new command  | `src/<command>/index.ts` (export options + handler) |
| Modify API calls | `src/fetch/index.ts`                                |
| Change auth flow | `src/user/`, `src/login/`                           |
| Update CLI help  | `src/index.ts` (yargs config)                       |

## CLI Commands

```
onlineornot docs              # Open docs
onlineornot checks list       # List uptime checks
onlineornot checks view <id>  # View specific check
onlineornot checks create     # Create check
onlineornot checks delete     # Delete check
onlineornot billing           # Open billing page
onlineornot login             # Get API token
onlineornot whoami            # Test auth
```

## Command Pattern

Each command exports yargs interface:

```typescript
// src/mycommand/index.ts
export const options = (yargs: Argv) => yargs.option("flag", {...});
export const handler = async (args: Args) => { ... };
```

## Build

```bash
pnpm run build    # esbuild -> onlineornot-dist/cli.js
pnpm run start    # Build + run with sourcemaps
./bin/onlineornot.js checks list  # Test locally
```

## Authentication

- Token: `ONLINEORNOT_API_TOKEN` env var
- API base: `https://api.onlineornot.com/v1`
- Verification: `GET /tokens/verify`
