# Roadmap

## Planned changes for 4.0

### Load `@resvg/resvg-js` lazily

`createRequire` is used today because a static `import()` would be visible to
bundlers and pull the native binding into every import. A real `import()` makes
`isResvgAvailable()` and `calculateSvgDimensions()` asynchronous, which is breaking.
A top-level `await import()` would load the optional package eagerly and defeat the
purpose.

Call sites: `utils/calculate-svg-dimensions.js`, `shape/dimensions.js`,
`bin/svgforge.js`, plus the resvg-related test files.

### Replace the `.call(this)` delegation

In `shape/shape.js` (`initSvg`/`dimensions`) and `mode/base.js` (`render/*`),
replace the delegation with real methods, inheritance or composition.

### Drop the `arguments.length` detection

`lib/svgforge.js` detects optional arguments via `arguments.length`.

### Move the processing core to `async`/`await`

In `lib/svgforge.js`, `utils/index.js` and `transform/svgo-pool.js` — the same
change that unblocks the lazy `import()`.

### Split `lib/svgforge.js`

It currently mixes the public class with queueing, layout orchestration and
stats. Resolve the `lib/svgforge.js` / `lib/svgforge/` entry-point collision in
the same move (candidate: `lib/index.js`).

### Lower `max-nested-calls`

Back to the default 3 once the `.call(this)` delegation is replaced; it is
currently raised to 6.

### Re-enable `prefer-private-class-fields`

Per file, once the modes use composition. It is currently off because the base
classes dispatch on overridable `_` members; `#` stays truly private.

### Re-enable `prefer-context-mock`

Once the tests own all their mocks. It is currently off in `test/**` because the
suite uses module-scope and shared mocks (`mock.fn`/`mock.method`).

## Decisions

- File and class names stay as they are; the `svg-sprite` prefix is documented in
  `docs/conventions.md`.
- Default export stays a factory, matching upstream `svg-sprite`.
- Internal renames are patch-level: the `exports` map has no wildcard.
