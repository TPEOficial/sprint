# Publishing a new version

Both `sprint-es` and `create-sprint` are published independently to npm. This doc covers the full release flow for each.

## Prerequisites

- npm account with publish rights on `sprint-es` and `create-sprint`.
- Logged into npm in your shell:
  ```bash
  npm whoami    # should print your username
  npm login     # if not
  ```
- Working tree is clean (commit or stash everything before bumping versions).
- You're on `main` and pulled the latest:
  ```bash
  git checkout main && git pull
  ```

## SemVer policy

| Change | Version bump |
|--------|--------------|
| Bug fix, internal refactor, doc-only | **patch** (`1.0.0` → `1.0.1`) |
| New feature, new module, additive API | **minor** (`1.0.0` → `1.1.0`) |
| Breaking change (renamed/removed export, changed default, dropped Node version) | **major** (`1.0.0` → `2.0.0`) |

Anything that would make a user have to change code to upgrade = major. Defaults that change observable behavior (e.g. CORS, body limits) = major.

## Publishing `sprint-es`

### 1. Pre-flight checks

From `packages/sprint-es`:

```bash
cd packages/sprint-es

npm test            # all 134+ tests must pass
npm run build       # must succeed clean
ls dist/esm dist/cjs dist/types   # sanity check the artifact tree
```

If you added new modules in this release, double-check:

- `vite.config.ts` lists them under `build.lib.entry`.
- `package.json` `exports` and `typesVersions` declare the new subpath.
- New peer deps are in `peerDependencies` + `peerDependenciesMeta` (with `optional: true` if they should not block install).

### 2. Bump the version

`sprint-es` does **not** auto-bump on `prepublishOnly`. Bump explicitly:

```bash
npm version patch         # or `minor` / `major`
# This commits and tags the bump on the current branch.
```

If you'd rather bump manually, edit `packages/sprint-es/package.json` `version` field and commit.

### 3. Publish

```bash
npm publish --access public
```

`prepublishOnly` runs `npm run build` automatically — never publish without that step.

To do a dry run first:

```bash
npm publish --dry-run
```

It prints the exact tarball file list. Verify nothing sensitive (e.g., `.env`, source maps you don't want) is included. The `files` field in `package.json` controls this — currently `dist/**/*`, `README.md`, `LICENSE`.

### 4. Tag and push

```bash
git push --follow-tags
```

This publishes the version commit AND the `v1.x.y` tag created by `npm version`.

### 5. Create a GitHub release (optional but recommended)

```bash
gh release create v1.x.y \
    --title "sprint-es v1.x.y" \
    --notes "Release notes here"
```

## Publishing `create-sprint`

### 1. Pre-flight checks

From `packages/create-sprint`:

```bash
cd packages/create-sprint

npm run build

# Smoke-test the generator end-to-end:
mkdir -p /tmp/cs-test && cd /tmp/cs-test
node $OLDPWD/dist/cli.js --yes --name testapp --queue memory --no-install
ls testapp/src/services/
cat testapp/sprint.config.ts
```

If you bumped peer-dep version ranges in templates, smoke-test with `--no-install` removed (or do `npm install` inside the generated project) to confirm dependency resolution works.

### 2. Bump the version

`create-sprint` **auto-bumps patch** as part of `prepublishOnly` (see `package.json` script). For a patch release you can rely on it. For minor/major you must bump explicitly first:

```bash
# patch (just publish — auto-bump happens)
npm publish --access public

# minor / major (bump first, then publish without re-bumping)
npm version minor                  # commits + tags
# ...then either edit prepublishOnly to drop the auto-bump, or publish carefully:
npm publish --access public        # this will run the auto-patch and bump again
```

If the auto-patch in `prepublishOnly` is in your way for non-patch releases, either:

- **Recommended**: split the script — change `prepublishOnly` to just `npm run build` and bump manually, like `sprint-es` does.
- Or temporarily comment out the version step before publishing a major.

### 3. Publish

```bash
npm publish --access public
```

The `prepublishOnly` script runs `npm version patch && npm run build` first. Verify the published version with:

```bash
npm view create-sprint version
```

### 4. Tag and push

```bash
git push --follow-tags
```

## Bumping the `sprint-es` version reference inside `create-sprint`

When `sprint-es` ships a new minor or major, update the version pin in the template so newly scaffolded projects pull it:

```ts
// packages/create-sprint/src/templates/packageJson.ts
const deps: Record<string, string> = {
    "sprint-es": "^1.0.0"   // bump this on every sprint-es minor/major
};
```

After editing, rebuild and republish `create-sprint` (patch bump is enough — it's a template change, not a CLI behavior change).

## When to publish both together

If a `sprint-es` change introduces a new module that the scaffolder should know about (e.g. add `--graphql` flag → import a new module), publish in this order:

1. `sprint-es` first.
2. `create-sprint` second, with the template updated to reference the new `sprint-es` version.

That avoids a window where a freshly-scaffolded project references a `sprint-es` version that doesn't exist on npm yet.

## Unpublishing / deprecating

npm only allows unpublishing within 72h of publish. After that, deprecate instead:

```bash
npm deprecate sprint-es@1.x.y "Use 1.x.z instead — see <link to issue>"
```

For a critically broken release, publish a fixed patch immediately rather than relying on deprecation.

## Quick reference

```bash
# sprint-es patch release
cd packages/sprint-es
npm test && npm run build
npm version patch
npm publish --access public
git push --follow-tags

# create-sprint patch release (auto-bumps)
cd packages/create-sprint
npm run build
node dist/cli.js --yes --name /tmp/smoke --no-install   # smoke
npm publish --access public
git push --follow-tags
```
