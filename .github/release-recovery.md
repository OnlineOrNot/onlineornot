# Recovering a missing release tag

A published package must keep its original source commit. Do not tag the current
`main` commit just because its package version is unchanged, move an existing
tag, or republish the npm version to fix a GitHub release.

GitHub can reject a historical tag push with "refusing to allow a GitHub App to
create or update workflow ... without workflows permission" when the historical
workflow differs from the current branch. `contents: write` on `GITHUB_TOKEN`
does not grant this permission, and `workflows` is not a valid workflow
`permissions` key. Changing the permissions of an unrelated installed App does
not change checkout's default `GITHUB_TOKEN`.

## One-time operator recovery

Prefer a one-time authorized tag push if this is an isolated recovery. No new CI
secret or permanent App permission change is needed if an operator already has
workflow-authorized repository write access.

For `@onlineornot/api@0.2.1`, the version history helper selects
`902085734bb56fd2fc28e96a5d8c2261eca50120`. The npm provenance statement also names
that commit and release run `34875311430`. Commit `e12ac45` changed `release.yml`
after publication; run `34939998334` then failed to push the historical tag.

After verifying provenance and checking that the remote tag is absent, an
operator can run the following in a clean checkout with their own authorized
credentials. These commands are instructions, not part of automated recovery:

```sh
git fetch origin main --tags
git ls-remote --exit-code origin 'refs/tags/@onlineornot/api@0.2.1'
# Continue only if the query succeeded with no match (exit 2), not a network error.
git tag '@onlineornot/api@0.2.1' 902085734bb56fd2fc28e96a5d8c2261eca50120
git push origin 'refs/tags/@onlineornot/api@0.2.1'
```

If the tag already exists, inspect its peeled commit instead. Never force-push
it. An operator can then separately approve a release workflow run to finish the
GitHub release. Tag creation alone does not publish a package.

## Automated recovery

If unattended historical tag recovery is required, configure the repository
Actions secret `RELEASE_TAG_TOKEN` with repository-scoped credentials authorized
to write Contents and Workflows. A fine-grained PAT must also satisfy organization
approval policies. A GitHub App installation token needs both permissions and
expires; token minting/rotation is not implemented here. Do not store an App
private key in this secret.

Only the explicit tag push uses this credential. Checkout, Changesets, npm OIDC,
and GitHub release creation retain their existing credentials. Without the
secret, tag pushes still use checkout's `GITHUB_TOKEN`, so ordinary releases need
no configuration change. Failed pushes remain failures with the exact tag and
commit in the diagnostic, including failures unrelated to permissions.

## References

- [Failed recovery run](https://github.com/OnlineOrNot/onlineornot/actions/runs/34939998334)
- [npm attestations](https://registry.npmjs.org/-/npm/v1/attestations/@onlineornot%2fapi@0.2.1)
- [GitHub App Git access permissions](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/choosing-permissions-for-a-github-app#choosing-permissions-for-git-access)
- [Workflow token permissions](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#permissions)

The REST create-reference API also documents Contents plus Workflows as a
permission set. Switching to REST is not a documented way to bypass the
historical-workflow restriction.
