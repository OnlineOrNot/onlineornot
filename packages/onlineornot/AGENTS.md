# OnlineOrNot CLI Package

Command parsing, authenticated API adapters, interactive setup, and standalone
installation/update behavior for the published `onlineornot` executable.

## Where to Look

| Task                          | Location                                                                                            | Role                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| npm executable startup        | `bin/onlineornot.js`                                                                                | Node version check, child process, signal forwarding  |
| Bundle startup and exit codes | `src/cli.ts`                                                                                        | Background updater dispatch, calls `main()`           |
| Register commands/help        | `src/index.ts`                                                                                      | `createCLIParser()`, `main()`, `CommandLineArgsError` |
| Check CRUD and output         | `src/checks/`                                                                                       | yargs options, handlers, CLI-facing types             |
| SDK adaptation                | `src/api/`                                                                                          | Checks/tokens, envelope errors, pagination            |
| Token selection               | `src/user/index.ts`                                                                                 | Environment precedence and OAuth refresh              |
| OAuth and local credentials   | `src/auth/`, `src/login/`, `src/logout/`                                                            | PKCE, callback server, browser flow, persistence      |
| First-check onboarding        | `src/setup/`                                                                                        | `runSetup()`, URL validation, saved setup state       |
| Install/update/uninstall      | `install.sh`, `src/standalone-update.ts`, `src/auto-update.ts`, `src/update.ts`, `src/uninstall.ts` | Binary download, background checks, removal           |
| Build and release assets      | `scripts/`, `sea-config.json`                                                                       | npm/SEA bundles, patch verification, release notes    |

## Command Flow

- Register top-level commands in `createCLIParser()`; grouped check commands are
  registered in `src/checks/index.ts`. Follow neighboring options/handler exports
  and the shared yargs types in `src/yargs-types.ts`.
- Parser errors become `CommandLineArgsError`; `main()` logs and reparses with
  `--help` using a fresh parser. Other errors are logged and rethrown.
- Keep process termination in `src/cli.ts`; `main()` must remain callable in tests.
- Bare version output is machine-readable when stdout is not a TTY; banners are
  handled separately. Route command output through `src/logger.ts`.

## Authentication and API Ownership

- Use `getTokenAsync()` for requests: `ONLINEORNOT_API_TOKEN` takes precedence,
  otherwise OAuth credentials are refreshed. `getTokenQuietly()` is display-only.
- Credentials live under `~/.config/onlineornot/credentials.json` via `Conf`.
  Corrupt credentials are cleared; expiration checks include a five-minute buffer.
- Browser authentication is shared by login/setup through `authenticateWithBrowser()`.
- Resource adapters call generated `@onlineornot/api` operations. `getApiConfig()`
  supplies auth, user-agent, redacted debug logging, and strips `/v1` from the CLI
  base URL because generated operations already include that prefix.
- `unwrapApiEnvelope()` retains pagination metadata; `unwrapApiResult()` extracts
  the resource. Both reject API failures and malformed envelopes with `ParseError`.
- Pagination belongs to `src/api/pagination.ts`, not the generated SDK. Numbered
  pagination stops at the total or an empty page; cursors reject immediate repeats.

## npm and Standalone Builds

- `scripts/bundle.ts` emits CommonJS to `onlineornot-dist/cli.js`; the npm wrapper
  launches it with inherited arguments and `--experimental-vm-modules`.
- `scripts/bundle-sea.ts` emits `sea/onlineornot.cjs`; `build-sea.sh` uses
  `node --build-sea` and ad-hoc signs the resulting `onlineornot` binary on macOS.
- `ONLINEORNOT_SEA` is fixed at build time: false for npm, true for SEA. Preserve
  that split so environment variables cannot turn npm execution into self-update.
- Source lint forbids `__dirname`/`__filename`. Its message and bundler comments
  mention `getBasePath()`, but that helper is absent; do not import it on that basis.
- `clean` removes `dist` and `sea`, **not** `onlineornot-dist`.
- `bundle --watch` currently performs a second build; it does not install a watcher.

## Focused Verification

From the repository root, after building the SDK:

```bash
pnpm --filter onlineornot run build
pnpm --filter onlineornot run check:type
pnpm --filter onlineornot run test:ci
node packages/onlineornot/bin/onlineornot.js --help
node packages/onlineornot/bin/onlineornot.js --version
```

- `vitest.config.mts` additionally typechecks `src/api/infrastructure.test.ts`;
  package `check:type` excludes `*.test.ts`.
- Installer/updater tests use temporary binaries and subprocess fixtures. Read
  those fixtures before changing asset names, checksums, or replacement behavior.
