# CI and Release Automation

GitHub Actions publishes npm packages and verified standalone CLI releases.
Release helper behavior is also covered by tests in `packages/api/test/`.

## Where to Look

| Task                               | Location                                                           | Purpose                                                        |
| ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| PR checks and cross-platform tests | `workflows/pullrequests.yml`                                       | Build/check, minimum npm runtime smoke tests, three OSes       |
| Commit previews                    | `workflows/prereleases.yml`                                        | Build both packages, verify SEA build, pkg.pr.new publication  |
| Versioning and production releases | `workflows/release.yml`                                            | npm publish, SDK release, binary matrix and delta assets       |
| Version/lockfile coordination      | `changeset-version.js`                                             | Changeset version followed by lockfile-only install            |
| Changesets compatibility           | `changeset-publish.mjs`                                            | JSONL report to legacy action tag lines                        |
| Registry state lookup              | `npm-package-version.mjs`                                          | Retry propagation delays; distinguish E404 from other failures |
| Publication/tag recovery           | `package-release-published.mjs`, `find-package-version-commit.mjs` | Package-specific publication and original version commit       |

## Release Invariants

- The npm workflow checks out `github.sha`; binary jobs and final publication
  check out the immutable `onlineornot@<version>` tag, not a moving branch.
- Fresh binary runners must build `@onlineornot/api` before the SEA bundle.
- CLI and SDK publication are independent. SDK tags are `@onlineornot/api@<version>`;
  SDK GitHub releases use `--latest=false` so CLI updater discovery stays correct.
- Preserve recovery when npm publication succeeded but GitHub release creation
  did not. Pending-release detection checks the exact version, npm latest, and
  absence of a published GitHub release; missing tags recover the version commit.
- Changesets v3 emits machine-readable events; the action still needs `New tag:`
  lines. Preserve the adapter rather than parsing human-facing publish output.
- Registry E404 can mean an unpublished version. Auth/network failures must
  propagate rather than being treated as absence.
- Build linux/darwin × amd64/arm64 assets. Each needs a binary, deterministic
  gzip, and SHA-256 sidecar before the release can be published.
- Delta patches are optional, but surviving patches must pass
  `packages/onlineornot/scripts/verify-release-patches.mts`. Full downloads remain
  available when patches cannot be generated.
- Upload the complete verified asset set to a draft, then publish it as latest.
  Preserve serialized release concurrency (`cancel-in-progress: false`).

## Verification and Credentials

- Read `packages/api/test/release-workflow.test.ts` and
  `packages/api/test/changeset-publish.test.ts` when changing workflow/helper logic.
- npm publication uses provenance and Trusted Publishing; each package needs its
  own publisher configuration. `id-token: write` belongs to the publishing job.
- Running the publish/version helpers performs real publication or version edits;
  use tests and builds for local verification.
