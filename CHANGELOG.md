Newer release notes are published on the GitHub release page: <https://github.com/svgforge/svgforge/releases>

---

## Unreleased

### Changed: bring back the `.dims` size API for the «view» mode

* The «view» mode can again render the plain `.dims` size stylesheet via
  `render: {css: true}` (using the shared `tmpl/common/sprite.css`), providing
  `width`/`height`-only classes (`<icon>-dims`) so consumers can size an icon by
  class name without knowing its dimensions — exactly like defs/symbol/stack.
* The «view» preview HTML sets the `.svg-…-dims` class on its `<img>` elements
  and inlines the matching dimension rules (stack-style), so the preview renders
  at the correct icon size even without an external stylesheet.

---

## 1.0.1 — Patch release (first publishable fix)

### Refactor: Drop remaining lodash/async dependencies

* Replace the `async` package with native Promise-based helpers
  (`runWaterfall`/`runParallelLimit`) and drop `async` from the dependencies;
  the shape processing queue now uses a fixed concurrency limit of 4 instead
  of scaling with the CPU core count
* Replace `lodash.merge` with a native `deepMerge` utility
  (`lib/svg-sprite/utils/index.js`) and drop `lodash.merge` from the
  dependencies
* Replace `lodash.escape` with a native `escapeHtml` utility
  (`lib/svg-sprite/utils/index.js`) and drop `lodash.escape` from the
  dependencies

## 1.0.0 — First release (based on old svg-sprite package)

### Removed: «css» sprite mode and view stylesheet rendering

* Drop the «css» sprite mode completely (mode registration, configuration,
  templates, tests and documentation)
* Slim the «view» mode down to a pure `<view>`-based SVG fragment sprite (no
  more `render: {css, scss}` stylesheet generation and no more
  `background`/`background-position` CSS)
* **Remove bin-packing layout from «view» mode** — replace with simple
  horizontal row placement (shapes placed sequentially in a single row)
* Remove the `mode/css/packer.js` and its test (was the bin-packing engine
  originating from the css mode)
* Rename `mode/css.js` to `mode/viewbase.js` (`SVGSpriteCss` →
  `SVGSpriteViewBase`) as a layout base kept only for the view mode
* Move the default CSS/SCSS templates from `tmpl/css/` to `tmpl/common/` (left
  in place for the `defs`, `symbol` and `stack` modes, which keep their plain
  non-`background-position` stylesheet rendering) and remove the obsolete
  `tmpl/css/` directory
* Remove the `scss` (Sass) stylesheet template `tmpl/common/sprite.scss`
  (identical to `sprite.css` — plain CSS is sufficient without background-position)
* Recommend the `stack` mode (SVG fragment identifiers) as an alternative for
  background-image sprite usage

### Refactor: ES6 classes and xo-default linting

* Convert `SVGSpriter`, `SVGShape` and all sprite mode classes from
  prototype-based to ES6 classes (`SVGSpriteBase` + subclasses, `SVGSpriteCss`,
  `SVGSpriteView`, `SVGSpriteDefs`, `SVGSpriteStack`, `SVGSpriteSymbol`,
  `SVGSpriteStandalone`)
* Strip all `off` rules from `xo.config.js`; fixed lint findings in code with
  justified line/file-level disables
* Add `require-unicode-regexp` enforcement (`u` flag, per `requireFlag: 'u'`)
  and raise `max-nested-calls` to 6 (required by `path.resolve(...)` chains)
* Migrate the complete test suite from Jest to `node --test` with a
  `jest-compat.js` compatibility layer (`createMock`/`spyOn` instead of
  `jest.*`, dependency injection via `lib/deps.js`)
* Drop LESS/Stylus support entirely (code, dependencies, documentation)
* Raise pixelmatch tolerance (`MAX_MISMATCH` 5 → 130) for AA differences under
  the upgraded Chromium/Playwright rendering pipeline
* Change primary author to Felix Müller; Joschi Kuphal remains as contributor
* Replace the `glob` package with the native `fs.globSync`/`node:fs` API and
  drop `glob` from the (dev) dependencies; `engines.node` is `>= 22` (required
  for the glob API introduced in Node 22)
* Normalize the `file` and `name` arguments of `SVGSpriter.prototype.add()` via
  `path.normalize()` so both values use the same path separators (fixes
  svg-sprite/svg-sprite#942, per PR svg-sprite/svg-sprite#944); the now
  redundant `trimStart()` call on `name` was dropped


# About

The `1.0` release is **rewritten from scratch** and introduces a bunch of new features like **less dependencies**, support for **inline sprite formats** and the **removal of file-system access** so that other libraries can build on top of it more easily.
