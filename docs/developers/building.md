# Building Sprint

The repo is an npm workspaces monorepo with two publishable packages and several examples.

## Layout

```
sprint-node/
├── packages/
│   ├── sprint-es/        # Main framework (published as "sprint-es")
│   └── create-sprint/    # Project scaffolder (published as "create-sprint")
├── examples/             # Standalone example apps (not published)
└── docs/
```

## Prerequisites

- **Node.js**: ≥ 18 (uses native `fetch`, `AbortController`, `worker_threads`)
- **npm**: ≥ 7 (for workspaces support)

Install all workspace dependencies once from the repo root:

```bash
npm install
```

This sets up symlinks between workspaces so `examples/*` consume the local `packages/sprint-es` source instead of the published version.

## Build `sprint-es`

```bash
cd packages/sprint-es
npm run build
```

What it does:

1. **Vite** bundles every entry in `vite.config.ts` (the main `index.ts`, the `cli.ts`, and every `src/modules/*/index.ts`) into both ESM (`dist/esm/**`) and CJS (`dist/cjs/**`).
2. **vite-plugin-dts** emits `.d.ts` declaration files into `dist/types/**`.
3. A small post-build script prepends a `#!/usr/bin/env node` shebang to `dist/esm/cli.js` so the CLI is executable.

Output paths (must stay in sync with `package.json` `exports` / `typesVersions`):

```
dist/
├── esm/
│   ├── index.js
│   ├── cli.js
│   └── modules/<name>/index.js
├── cjs/
│   ├── index.cjs
│   ├── cli.cjs
│   └── modules/<name>/index.cjs
└── types/
    ├── index.d.ts
    └── modules/<name>/index.d.ts
```

When you add a new module under `src/modules/<name>/`:

1. Add an entry in `vite.config.ts` (`build.lib.entry["modules/<name>/index"]`).
2. Add a subpath export in `package.json` (`exports["./<name>"]` + `typesVersions["*"]["<name>"]`).
3. If it depends on a peer dependency that should NOT be bundled, add it to `vite.config.ts` `rollupOptions.external` and to `peerDependencies` + `peerDependenciesMeta` in `package.json`.

Useful one-offs:

```bash
npm run clean      # remove dist/
npx tsc --noEmit   # type-check without emitting (skips dts)
```

## Build `create-sprint`

```bash
cd packages/create-sprint
npm run build
```

What it does:

1. `rimraf dist`
2. `tsc` — compiles `src/**/*.ts` straight to `dist/**` (no bundler, no dts emit since the CLI isn't consumed as a library).
3. Post-build prepends `#!/usr/bin/env node` to `dist/cli.js`.

To smoke test the generator without publishing:

```bash
cd /tmp && rm -rf scratch && mkdir scratch && cd scratch
node ~/path/to/sprint-node/packages/create-sprint/dist/cli.js \
    --yes --name testapp --queue bullmq --cache redis --trpc \
    --cors "https://app.example.com" --no-install
```

Inspect `testapp/` to verify the generated tree (`sprint.config.ts`, `src/app.ts`, `src/services/queue.ts`, etc.).

## Build everything from the repo root

The root `package.json` exposes workspace scripts. Run both builds in parallel:

```bash
# From repo root
npm run build --workspace=sprint-es --workspace=create-sprint
```

Or sequentially with explicit chaining:

```bash
npm run build --workspace=sprint-es && npm run build --workspace=create-sprint
```

## Examples

Examples are standalone npm projects under `examples/` that consume `sprint-es` from the local workspace via the npm-install symlink. To run one:

```bash
cd examples/queues-microservice-example
npm install     # already done if you ran `npm install` from the repo root
npm run dev
```

If you change `sprint-es` source, rebuild it (`npm run build --workspace=sprint-es`) before running examples that import from `dist/` (note: the framework `dev` script for sprint-es uses `ts-node` so source changes are picked up directly when running its own dev process; for examples you need the dist).
