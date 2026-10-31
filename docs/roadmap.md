# Roadmap

Open items and postponed changes. Finished work is in `git log`, not here.

## Open now

| Item | Notes |
| --- | --- |
| Stale `shape.align` docs | `docs/configuration.md` still documents `shape.align` and links a `shape-alignment.md` that does not exist. The option was removed together with the «css» mode |
| Deep imports undocumented | README's "Changes compared to svg-sprite" does not mention that the `exports` map blocks `lib/svg-sprite/*` paths |
| `lib/svgforge.js` | Mixes the public class with queueing, layout orchestration and stats |
| `lib/svgforge.js` + `lib/svgforge/` | Entry-point/folder collision; candidate: `lib/index.js` |
| `test/svgforge/layouter.test.js` | Tests template `fileSize` data, not the layouter |
| JSDoc accuracy | Types are lint-checked for existence, not correctness (`@param {Array} files` for a map) |

## 3.2.0 — Retire the test harness shim

`test/helpers/harness.js` provides `expect()`, snapshots, mocks and custom matchers
on top of `node:test`. Internal only (`test/` is not published), so this is a minor
release, but the work is substantial:

- ~650 assertions → `node:assert/strict`
- ~180 mocks → `mock.fn()` / `mock.method()`; one-shot chaining becomes explicit call sequences
- asymmetric matchers (`expect.any`, `expect.objectContaining`, …) → predicate helpers
- four `toMatchSnapshot()` calls → `t.assert.snapshot()` with the test context
- three custom matchers (`toBeVisuallyEqualTo`, `toBeVisuallyCorrectAsHTMLTo`, `toBeDefaultLogger`) → async helpers

Do this when the suite is otherwise stable; the visual tests are the risky part.

## 4.x — `@resvg/resvg-js`

### Optional peer dependency

Today it is a regular peer dependency, so npm and pnpm install it automatically.
Making it optional breaks icon sets whose SVGs have neither `viewBox` nor
`width`/`height`: those shapes are skipped unless the package is installed.

- `package.json`: `peerDependenciesMeta['@resvg/resvg-js'].optional = true`
- keep `autoInstallPeers: false` and `peerDependencyRules.ignoreMissing` in
  `svgforge/` and `svgforge-cli/`
- `svgforge-cli/package.json`: bump the dependency to `^4.0.0`
- changelogs in both repos

### Load it with a lazy `import()`

`createRequire` is used today because a static `import()` would be visible to
bundlers and pull the native binding into every import. A real `import()` makes
`isResvgAvailable()` and `calculateSvgDimensions()` asynchronous, which is breaking.
A top-level `await import()` would load the optional package eagerly and defeat the
purpose.

Call sites: `utils/calculate-svg-dimensions.js`, `shape/dimensions.js`,
`svgforge-cli/bin/svgforge.js`, plus the resvg-related test files.

## 4.x — Internal cleanups

- Replace the `.call(this)` delegation (`shape/shape.js` → `initSvg`/`dimensions`,
  `mode/base.js` → `render/*`) with real methods, inheritance or composition.
- Drop the `arguments.length` optional-argument detection in `lib/svgforge.js`.
- Move the processing core to `async`/`await` (`lib/svgforge.js`, `utils/index.js`,
  `transform/svgo-pool.js`) — the same change that unblocks the lazy `import()`.

## Decisions

- File and class names stay as they are; the `svg-sprite` prefix is documented in
  `docs/conventions.md`.
- Default export stays a factory, matching upstream `svg-sprite`.
- Internal renames are patch-level: the `exports` map has no wildcard.
