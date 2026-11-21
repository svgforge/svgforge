# svgforge

This file is part of the documentation of *svgforge* — a free low-level Node.js module that **takes a bunch of SVG files**, optimizes them and creates **SVG sprites** of several types. The package is [hosted on GitHub](https://github.com/svgforge/svgforge).


## Standard API

*svgforge* provides these public methods:

* [SVGSpriter([ config ])](#svgspriter-config-) — The spriter's constructor (always the entry point)
* [SVGSpriter.add(file [, name, svg ])](#svgspriteraddfile--name-svg-) — Registering source SVG files
* [SVGSpriter.compile([ config ])](#svgspritercompile-config-) — Triggering the sprite compilation
* [SVGSpriter.getShapes([ dest ])](#svgspritergetshapes-dest-) — Accessing the intermediate SVG resources

The package default-exports `createSpriter` (also `new`-compatible). Named exports are available for `createSpriter`, `SVGSpriter`, and error classes (`ArgumentError`, `DimensionsCalculationError`, `NotPermittedError`, `XmlFixingError`).

To understand these methods' roles and interactions, please have a look at the following basic example first.

### Usage example

```js
import fs from 'node:fs';
import path from 'node:path';
import SVGSpriter from '@svgforge/svgforge';

// 1. Create and configure a spriter instance
// ====================================================================
const spriter = new SVGSpriter({
  dest: 'out', // Main output directory
  mode: {
    symbol: { // Create a symbol sprite
      render: {
        css: true // Render a CSS stylesheet
      }
    }
  }
});

// 2. Add some SVG files to process
// ====================================================================
spriter.add(
  path.resolve('assets/example-1.svg'),
  'example-1.svg',
  fs.readFileSync('assets/example-1.svg', 'utf-8')
);

/* ... */

spriter.add(
  path.resolve('assets/example-x.svg'),
  'example-x.svg',
  fs.readFileSync('assets/example-x.svg', 'utf-8')
);

// 3. Trigger the (asynchronous) compilation process
// ====================================================================
const {result} = await spriter.compile();

// Run through all files that have been created for the `symbol` mode
for (const type of Object.values(result.symbol)) {
  // Recursively create directories as needed
  fs.mkdirSync(path.dirname(type.path), {recursive: true});
  // Write the generated resource to disk
  fs.writeFileSync(type.path, type.contents);
}
```

#### SVGSpriter([ config ])

**Constructor** — This is the only method publicly exposed by *svgforge*, so it's always your entry point. Use it to create an instance of the spriter and access the remaining three methods.

##### Arguments

1. **config** `{Object}` *(default: `{}`)* — [Main configuration](configuration.md) for the spriting process. As all configuration properties are optional, you may provide an empty object here or omit the argument altogether (no output files will be created then, but the [added SVG files](#svgspriteraddfile--name-svg-) will be optimized nevertheless). The `mode` configuration properties may also be specified when calling the `.compile()` method ([see below](#svgspritercompile-config-)).

#### Spriter events

The spriter instance is a Node.js [`EventEmitter`](https://nodejs.org/api/events.html#class-eventemitter), so you can subscribe to lifecycle events:

* **`progress`** `{processed: number, total: number}` — Emitted for every shape that has finished processing (optimization & complementing). `processed` is the number of shapes completed so far, `total` the number of shapes registered via [`add()`](#svgspriteraddfile--name-svg-). The final event reports `processed === total`. Useful for progress indicators (e.g. a CLI progress bar):

```js
spriter.on('progress', ({processed, total}) => {
  process.stderr.write(`\rProcessing ${processed}/${total}`);
});
```

* **`shape-skipped`** `{file: string, error: Error}` — Emitted whenever a shape is **skipped**, so consumers can react programmatically instead of relying on the configured logger alone. `file` is the shape name, `error` the underlying error. There are two reasons for a skip:

  * **Missing/undeterminable dimensions** (a warning) — e.g. an SVG without `width`/`height`/`viewBox` attributes when the [`@resvg/resvg-js`](https://www.npmjs.com/package/@resvg/resvg-js) dimension fallback is not installed. The error message carries the install command for the fallback and the spriter logs a **warning**.
  * **Any other processing error** (a hard error) — e.g. a file that is not valid SVG/XML. The spriter logs an **error** carrying the parser reason.

  Either way the build continues with the remaining shapes, which are the only ones written to the sprite:

```js
spriter.on('shape-skipped', ({file, error}) => {
  console.warn(`Skipping "${file}" (${error.message})`);
});
```

#### SVGSpriter.add(file [, name, svg ])

**Registration of an SVG file** — Before compilation, you'll need to register one or more SVG files for processing. As *svgforge* doesn't read the files from the disk itself, you'll have to pass both the path and the file contents explicitly. Alternatively, you may pass a file object (`{base, path, contents}` with `contents` as a `Buffer`) as the first argument to `.add()`, which comes in handy when piping resources from one process to another. Please [see below](#example-using-glob-and-file-objects) for an example.

It is important to know that the spriter **optimizes the SVG files as soon as you register them**, not just when you [compile your sprite](#svgspritercompile-config-). This way it is possible to call the `.compile()` method several times, possibly passing in different render configurations without the need of repeating the optimization steps.

##### Arguments

1. **file** `{String|object}` — Absolute path to the SVG file or a file object carrying all the necessary values (the following arguments are ignored then).
2. **name** `{String}` *(ignored when a file object is passed)* — The "local" part of the file path, possibly including subdirectories which will get traversed to CSS selectors using the `shape.id.separator` [configuration option](configuration.md#shape-ids). You will want to pay attention to this when recursively adding whole directories of SVG files (e.g. via [glob](#example-using-glob-and-file-objects)). When `name` is empty, *svgforge* will use the basename of the `file` argument. As an example, setting `name` to `"deeply/nested/asset.svg"` while giving `"/path/to/my/deeply/nested/asset.svg"` for `file` will translate to the CSS selector `"deeply--nested--asset"`.
3. **svg** `{String}` *(ignored when a file object is passed)* — SVG file content.

##### Example using [glob](https://github.com/isaacs/node-glob) and file objects

```js
import fs from 'node:fs';
import path from 'node:path';
import SVGSpriter from '@svgforge/svgforge';

const spriter = new SVGSpriter({
  dest: 'out',
  mode: {
    symbol: {
      render: {
        css: true
      }
    }
  }
});
const cwd = path.resolve('assets');

// Find SVG files recursively via `fs.globSync`
const files = fs.globSync('**/*.svg', { cwd }).sort().reverse();

for (const file of files) {
  // Create and add a file object for each SVG
  spriter.add({
    path: path.join(cwd, file), // Absolute path to the SVG file
    base: cwd, // Base path (see `name` argument)
    contents: fs.readFileSync(path.join(cwd, file)) // SVG file contents
  });
}

const {result} = await spriter.compile();
for (const type of Object.values(result.symbol)) {
  fs.mkdirSync(path.dirname(type.path), {recursive: true});
  fs.writeFileSync(type.path, type.contents);
}
```

#### SVGSpriter.compile([ config ])

**Sprite compilation** — Triggers an asynchronous sprite compilation process and returns a `Promise`. You may pass in an optional [output mode configuration](configuration.md#output-modes) object to set the output parameters for that run. You may call `.compile()` multiple times, allowing for several different sprites to be generated by the same spriter instance.

##### Arguments

1. **config** `{Object}` *(optional)* — Configuration object setting the [output mode parameters](configuration.md#output-modes) for a single compilation run. If omitted, the `mode` property of the [main configuration](configuration.md) used for the [constructor](#svgspriter-config-) will be used.

##### Returns

Promise resolving to an object with:

* **result** `{Object}` — Directory of generated resources ([see below](#compilation-example))
* **data** `{Object}` — Templating variables passed to [Vento](https://vento.js.org) for rendering the resources (see [sprite & shape variables](templating.md#sprite--shape-variables) for details)

##### Compilation example

Depending on the particular mode and render configuration, quite a lot of resources might be generated during a single compilation run. To understand the way *svgforge* returns these resources, please have a look at the following example:

```js
const {result} = await spriter.compile({
  symbol: {
    render: {
      css: true
    },
    example: true
  }
});

console.log(result);
```

The spriter is instructed to create a symbol sprite along with the accompanying stylesheet resource in CSS format and an example HTML document demonstrating the use of the sprite. The output will look something like this (shortened for brevity):

```js
{
  symbol: {
    sprite: { base, path: "symbol/svg/sprite.symbol.svg", contents: <Buffer 3c 3f 78 ...> },
    css: { base, path: "symbol/sprite.css", contents: <Buffer 2e 73 76 ...> },
    example: { base, path: "symbol/sprite.symbol.html", contents: <Buffer 3c 21 44 ...> }
  }
}
```

For each configured output mode (`symbol` in the example), the `result` object holds an item containing the resources generated for this particular mode. There is always a `sprite` resource (obviously) and possibly an `example` resource for the demo HTML document (if configured). For the output modes with stylesheet rendering (the [defs, symbol, view and stack modes](configuration.md#defs--symbol-mode)), there are additional items named after the configured [rendering configurations](configuration.md#rendering-configurations) (`css` in the example).

The resources are returned as file objects with `base`, `path`, `contents` and `relative` properties. Have a look above for an [example of how to write these files to disk](#example-using-glob-and-file-objects).

#### SVGSpriter.getShapes([ dest ])

**Accessing the intermediate SVG resources** — Sometimes you may want to access the single transformed/optimized SVG files that *svgforge* produces in an intermediate step. Depending on the [configured shape transformations](configuration.md#shape-transformations) (e.g. SVG optimization with [SVGO](https://github.com/svg/svgo)), *svgforge* will need some time for transforming the files, which is why accessing them must be an asynchronous task.

##### Arguments

1. **dest** `{String}` *(optional)* — Base directory for the SVG files in case they will be written to disk.

##### Returns

Promise resolving to an array of file objects carrying the intermediate SVGs.

##### Shape access example

```js
import fs from 'node:fs';
import path from 'node:path';

const files = await spriter.getShapes(path.resolve('tmp/svg'));
for (const file of files) {
  fs.mkdirSync(path.dirname(file.path), {recursive: true});
  fs.writeFileSync(file.path, file.contents);
}
```
