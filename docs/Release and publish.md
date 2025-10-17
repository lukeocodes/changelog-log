## Release and publish

### Release-please

- We use release-please with a manifest config to manage versions and changelogs for changelog-log at the repository root.
- On pushes to `main`, release-please will open/update a release PR. When merged, it will tag and create a GitHub Release.

### npm publish

- When a GitHub Release is published, a workflow publishes the changelog-log package to npm using `pnpm`.
- Provide `NPM_TOKEN` repository secret with publish rights to the target npm org/user.

### Notes

- The published package is the helper script the composite action relies on. The composite action itself remains usable from the repository via `uses: owner/changelog-log@v1`.
- Ensure conventional commits for clean release notes.
