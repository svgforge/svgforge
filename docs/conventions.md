# Code conventions

How `lib/` is organised. Read this before adding a file or a mode.

## Files and exports

- File name = kebab-case of the exported identifier, domain prefix omitted:
  `SVGSpriteLayouter` → `layouter.js`, `SVGSpriterQueue` → `queue.js`,
  `ArgumentError` → `argument-error.js`.
- Only exported names count. An unexported `defaultConfig` does not name a file.
- One primary class or function per file; supporting constants live beside it.
- `index.js` only as a module face with a reason: `lib/svgforge.js`,
  `lib/svgforge/utils/index.js` (public subpath), `lib/svgforge/shape/index.js`
  (factory for the shape subsystem).

## Visibility

| Name | Public | Note |
| --- | --- | --- |
| `SVGSpriter` | yes | documented in `README.md` and `docs/api.md` |
| `SVGSpriterConfig`, `SVGSpriterQueue` | no | internal |
| `SVGShape`, `SVGSprite*` | no | internal |

The entry point default-exports `createSpriter()`, callable with and without
`new` — the same shape as upstream `svg-sprite`.

The `exports` map has no wildcard: everything below `lib/` is internal except
`.`, `./utils` and the legacy `./lib/svg-sprite/utils/index.js` alias.

## Layout

| Folder | Responsibility |
| --- | --- |
| `shape/` | input: parsing, dimensions, namespaces, references, defaults |
| `mode/` | output strategies, plus `registry.js` |
| `render/` | files generated from templates (CSS resources, HTML example) |
| `transform/` | SVGO pipeline |
| `utils/` | small standalone helpers |

The mode list exists once, in `mode/registry.js`, together with each mode's
defaults. `layouter.js` dispatches to those classes and computes no geometry;
the row layout of `<view>` lives in `mode/view-layout.js`.

## Privacy

- `#` for genuinely private members.
- `_` for members a base class dispatches (`_init`, `_layout`, `_buildSVG`), for
  members another module calls, and for `_limit`, `_dimensionSkipped` and
  `_errorSkipped`, which `svgforge-cli` reads.

## Dependency injection

- Keys come from `dependencyKeys` in `lib/deps.js`; call sites reference the
  constant instead of a literal.
- Production: `getDependency(dependencyKeys.x, fallback)`.
- Tests: `setDependency(dependencyKeys.x, mock)`, `resetDependencies()`.
- Internal seams use `namespace:kebab-case`; third-party modules use their
  package name (`csso`, `@resvg/resvg-js`).

## Tests

- Test file name = unit under test; the tree mirrors `lib/`.
- Fixtures in `test/fixture/`, helpers in `test-utils/`.
- The visual comparison tolerance is 5 pixels (`MAX_MISMATCH` in
  `test-utils/compare-png-2-png.js`).

## JSDoc and comments

- JSDoc is the API contract (types, editor hints, lint rules) and is kept on
  classes and public methods.
- No filler: no `@type` blocks on obvious object properties, no comment that
  restates the identifier.
- Inline comments explain *why*, not *what*.
