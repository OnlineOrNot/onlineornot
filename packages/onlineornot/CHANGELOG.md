# onlineornot

## 0.0.12

### Patch Changes

- [#20](https://github.com/OnlineOrNot/onlineornot/pull/20) [`5d75685`](https://github.com/OnlineOrNot/onlineornot/commit/5d75685e62f85a60b96733d00be60eb40f6118fd) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: check API token before running commands

  This PR makes the error more intuitive when you run commands that call the API without a valid API token.

## 0.0.11

### Patch Changes

- [#18](https://github.com/OnlineOrNot/onlineornot/pull/18) [`6214750`](https://github.com/OnlineOrNot/onlineornot/commit/6214750fc5b91f21d20b3f1704dafd2271516a0a) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: improve whoami output

  This PR adds permission scopes to `onlineornot whoami` output, so you know what your token can do:

  ```bash
   ✅ onlineornot 0.0.10
  ----------------------
  Getting User settings...
  👋 You are logged in with an API Token.
  🔓 Token Permissions:
  Scope (Access)
  - uptime_checks (read)
  ```

## 0.0.10

### Patch Changes

- [`507d3df`](https://github.com/OnlineOrNot/onlineornot/commit/507d3df1ef33c90b96f449d1918ddefa0905ab56) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: make it possible to pick onlineornot's logLevel

## 0.0.9

### Patch Changes

- [#12](https://github.com/OnlineOrNot/onlineornot/pull/12) [`994a3ef`](https://github.com/OnlineOrNot/onlineornot/commit/994a3ef3c4e022653178a41f9c7c815d042b99c9) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: make `onlineornot checks` return the full result, even with pagination

## 0.0.8

### Patch Changes

- [`9779fde`](https://github.com/OnlineOrNot/onlineornot/commit/9779fde153930817954bd1e29b96c86ebffce76e) Thanks [@rozenmd](https://github.com/rozenmd)! - feat: make it possible to fetch a specific uptime check via `onlineornot check <id>`

## 0.0.7

### Patch Changes

- [#6](https://github.com/OnlineOrNot/onlineornot/pull/6) [`451af20`](https://github.com/OnlineOrNot/onlineornot/commit/451af204412131e6998d43915f4d01e92ae58e75) Thanks [@rozenmd](https://github.com/rozenmd)! - feat: make it possible to fetch a list of uptime checks

## 0.0.6

### Patch Changes

- [#4](https://github.com/OnlineOrNot/onlineornot/pull/4) [`6ad7c48`](https://github.com/OnlineOrNot/onlineornot/commit/6ad7c489f455b784a4f58ee78607a9369646a79d) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: add readme and publish from github
