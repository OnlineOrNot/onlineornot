# onlineornot

## 1.0.1

### Patch Changes

- [#40](https://github.com/OnlineOrNot/onlineornot/pull/40) [`ae309ff`](https://github.com/OnlineOrNot/onlineornot/commit/ae309ff10c16293c82f622c120d9e5d51df59392) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: improve error when token isn't authorized to create checks

- [#37](https://github.com/OnlineOrNot/onlineornot/pull/37) [`c1d7f82`](https://github.com/OnlineOrNot/onlineornot/commit/c1d7f82d7298ef1bc49a2d08ae81489c2e112e3e) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: print banner before fetching API

## 1.0.0

### Major Changes

- [#35](https://github.com/OnlineOrNot/onlineornot/pull/35) [`472b104`](https://github.com/OnlineOrNot/onlineornot/commit/472b1046c5282aa43db55e4742bb3eac4fbcdd50) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: make `onlineornot login` checked if you're logged in before doing anything

  Releasing this as onlineornot v1.0.0 as it's ready for prime time.

  Closes #34

### Patch Changes

- [#32](https://github.com/OnlineOrNot/onlineornot/pull/32) [`4f20e80`](https://github.com/OnlineOrNot/onlineornot/commit/4f20e8039885c9d1ead19f0acb20f35cee772bdd) Thanks [@rozenmd](https://github.com/rozenmd)! - fix: improve `onlineornot checks create` errors

## 0.0.16

### Patch Changes

- [#29](https://github.com/OnlineOrNot/onlineornot/pull/29) [`4a2a7e5`](https://github.com/OnlineOrNot/onlineornot/commit/4a2a7e5d369cc3f8f363b6b1ac994ff01edf6134) Thanks [@rozenmd](https://github.com/rozenmd)! - feat: make it possible to create uptime checks via `onlineornot checks create`

## 0.0.15

### Patch Changes

- [#27](https://github.com/OnlineOrNot/onlineornot/pull/27) [`1786959`](https://github.com/OnlineOrNot/onlineornot/commit/1786959bf9c9112b4a392915947f6a22bbc40dc1) Thanks [@rozenmd](https://github.com/rozenmd)! - feat: implement `onlineornot checks delete <id>`

- [#26](https://github.com/OnlineOrNot/onlineornot/pull/26) [`652b5a8`](https://github.com/OnlineOrNot/onlineornot/commit/652b5a8e039f8c38b82c28d8bf4abd50d91b948d) Thanks [@rozenmd](https://github.com/rozenmd)! - feat: implement login command

## 0.0.14

### Patch Changes

- [#24](https://github.com/OnlineOrNot/onlineornot/pull/24) [`b220c88`](https://github.com/OnlineOrNot/onlineornot/commit/b220c885c375bb7563b9ba88df494c5e2f0e94a0) Thanks [@rozenmd](https://github.com/rozenmd)! - feat: add docs and billing commands

## 0.0.13

### Patch Changes

- [#22](https://github.com/OnlineOrNot/onlineornot/pull/22) [`905d695`](https://github.com/OnlineOrNot/onlineornot/commit/905d695329031ca8b596c82b73d3ae9e301a61bb) Thanks [@rozenmd](https://github.com/rozenmd)! - chore: create a checks subcommand, move commands under it

  BREAKING CHANGE: This PR moves `onlineornot checks` and `onlineornot check <id>` to `onlineornot checks list` and `onlineornot checks view <id>`

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
