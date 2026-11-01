# Roadmap

Open items and postponed changes. Finished work is in `git log`, not here.

## Open now

| Item | Notes |
| --- | --- |
| `lib/svgforge.js` | Mixes the public class with queueing, layout orchestration and stats |
| `lib/svgforge.js` + `lib/svgforge/` | Entry-point/folder collision; candidate: `lib/index.js` |
| `test/svgforge/layouter.test.js` | Tests template `fileSize` data, not the layouter |
| JSDoc accuracy | Types are lint-checked for existence, not correctness (`@param {Array} files` for a map) |
| xo `max-nested-calls` | Raised to 6 for the render and mode call chains; the default is 3. Revisit once the `.call(this)` delegation is replaced (4.x) |
| xo `prefer-private-class-fields` | Off because base classes dispatch on overridable `_` members. Re-enable per file once modes use composition; `#` stays truly private |
| xo `prefer-context-mock` | Off in `test/**` because the suite uses module-scope and shared mocks (`mock.fn`/`mock.method`) that a test context cannot own; revisit once tests own all mocks |

## 4.x — Drop `vinyl`

`vinyl` is used for two unrelated things: it carries the **input** shapes
(`.add()`) and it is the **return type** of `.compile()` and `.getShapes()`.
Only the return type is a public promise (`docs/api.md` says the resources are
"always returned as vinyl files"), so the swap is a major change. Input keeps
working because a vinyl file already carries `base`, `path` and `contents`.

The 3.2.0 CLI release drops its own `vinyl` declaration; the package stays
installed as a transitive dependency of this library until this lands.

### What is actually used

Five construction sites; only `base`, `path`, `contents` and `relative` are read.
The sites are named by role, so the entry-point split listed under Open above
does not invalidate them.

| Site | Use |
| --- | --- |
| Spriter entry, `.add()` | `new File({base, path, contents})` for the `(path, name, svg)` input form |
| Spriter entry, `_getShapeFiles()` | one file per shape for `.getShapes()` / `shape.dest` |
| `sprite.js` `toFile()` | sprite and resource files (internal class) |
| `render/css-resources.js` | rendered stylesheet files |
| `render/html-example.js` | rendered example documents |

| Property | Read at |
| --- | --- |
| `base` | shape class (shape name), `_logStats` via `relative` |
| `path` | shape class, `_logStats` (extension) |
| `contents` | shape class (`contents.toString()`), `_logStats` (`.length`) |
| `relative` | `_logStats` |
| `base`, `path` (write) | `.add()` — `path.resolve()` both before queueing |

Unused, and not needed by a replacement: `stat`, `history`, `cwd`, `clone()`,
`isBuffer()`, `isStream()`, `isNull()`, `isDirectory()`, `isSymbolic()`,
`symlink`, `dirname`, `basename`, `stem`, `extname`.

### Replacement

One small class instead of the package:

```js
// lib/svgforge/file.js
import path from 'node:path';

export default class SpriteFile {
  constructor({base, path: filePath, contents}) {
    this.base = base;
    this.path = filePath;
    this.contents = contents;
  }

  get relative() {
    return path.relative(this.base, this.path);
  }
}
```

`relative` is the only derived value; everything else is plain data. Consumers
that write the files themselves (`fs.writeFileSync(file.path, file.contents)`,
the documented example) are unaffected.

### Why the break is worth it

**The cross-module check disappears.** `_isVinylFile()` exists because
`instanceof File` fails when the consumer has a second copy of `vinyl` — exactly
the bug that made the CLI write zero files with exit code 0. The duck-typed
fallback is also wrong for real vinyl files: `Object.hasOwn(file, 'relative')`
is `false` there (it is a prototype getter), so the fallback never applies.
A plain object check (`typeof file.base === 'string'`, `typeof file.path === 'string'`,
`Buffer.isBuffer(file.contents)`) is correct across copies and needs no
`constructor.name` guess.

**Silent misbehaviour goes away.** vinyl's contract allows stream and `null`
contents; `add()` accepts them and `shape/shape.js` then calls
`contents.toString()`. Verified against 3.1.0:

| `contents` | Outcome |
| --- | --- |
| `Readable` | `Skipping … (Invalid SVG file (missing root element))`, empty sprite, exit 0 |
| `null` | `Skipping … (Cannot read properties of null (reading 'toString'))`, empty sprite, exit 0 |

Those inputs are normal vinyl usage: `gulp.src('icons/*.svg', {buffer: false})`,
`{read: false}`, or a hand-built `new File({contents: fs.createReadStream(…)})`.
Rejecting them with an `ArgumentError` in `.add()` is the actual fix; dropping
the package is a side effect of writing that check honestly.

**Footprint.** 5 packages, ~52 KB unpacked: `vinyl` 23.9 KB, `clone` 15.9 KB,
`replace-ext` 4.9 KB, `remove-trailing-separator` 4.2 KB, `teex` 4.8 KB.

### Buffer vs. stream

svgforge only ever needs a Buffer: SVGO and xmldom require the complete document,
and a stream would have to be collected into one first. Measured with 213 SVGs
from `default-icons/src/tango` (6.14 MB, Ø 29.5 KB), median of 7 runs:

| Variant | Median | Overhead |
| --- | --- | --- |
| `fs.readFileSync` | 4.3 ms | — |
| `createReadStream` + collect | 27.1 ms | 6.3×, ~107 µs per file |

Object construction, 200,000 iterations: vinyl `File` 8.0 µs/file vs. a plain
object 3.8 µs/file — ~0.9 ms for the icon set, far below 0.1 % of a run. The
change is not a performance win; it removes a dependency and a failure mode.

### Breaking surface

| Public surface | Today | After |
| --- | --- | --- |
| `.compile()` result (`result.<mode>.sprite`, `.css`, `.example`, …) | vinyl `File` instances | `SpriteFile` instances |
| `.getShapes(dest, cb)` / `shape.dest` result | Array of vinyl files | Array of `SpriteFile` instances |
| `shape.id.generator(name, file)` second argument | the vinyl file | the `SpriteFile` |
| README "Output destinations" explanation | "uses vinyl file objects" | "passes file objects with `base`, `path`, `contents`" |

Callers break if they use `isBuffer()`, `isStream()`, `isNull()`, `clone()`,
`stat`, `history`, `cwd`, `symlink`, `dirname`/`basename`/`stem`/`extname` on
the returned objects, or pipe them into `vinyl-fs`' `dest()`. `SVGSprite#toFile()`
is internal (`SVGSprite*` classes are not public), so it is not part of the break.

Not breaking: `.add()` still accepts vinyl files and vinyl-like objects, and the
documented `fs.writeFileSync(file.path, file.contents)` pattern keeps working.

### Implementation

1. Add `lib/svgforge/file.js` with `SpriteFile` (above).
2. Replace the five `new File(...)` sites; drop the `vinyl` imports.
3. Rewrite `_isVinylFile()` as `_isFileLike()` — `isObject()`, `typeof base/path === 'string'`,
   `Buffer.isBuffer(contents)` — and remove the `instanceof`/`constructor.name` branch.
4. Reject non-Buffer contents in `.add()` with an `ArgumentError` (message names
   the accepted types) instead of skipping the shape later.
5. Update the test files that build vinyl input (12 today); add a test for the rejection path.
6. Docs: `README.md` (two paragraphs), `docs/api.md` (all vinyl references, nine
   today, incl. the glob example — switch it to `SpriteFile` or to plain
   `fs.readFileSync`), `docs/configuration.md` (two references).
7. Remove `vinyl` from `package.json`, regenerate the lockfile, run `npm test` and
   `npm run lint`; changelog entry under "Changed (breaking)".

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
