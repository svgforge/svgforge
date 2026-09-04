# svgforge

[![npm version][npm-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coveralls-image]][coveralls-url] [![npm downloads][npm-downloads]][npm-url]

svgforge is a low-level [Node.js](https://nodejs.org/) module that **takes a bunch of [SVG](https://www.w3.org/TR/SVG/) files**, optimizes them and bakes them into **SVG sprites** of several types:

* tiled sprites with **pre-defined `<view>` elements**, useful for foreground images via [SVG fragment identifiers](https://css-tricks.com/svg-fragment-identifiers-work/),
* inline sprites using the **`<defs>` element**,
* inline sprites using the **`<symbol>` element**
* and [SVG stacks](https://simurai.com/blog/2012/04/02/svg-stacks).

This is a fork of [svg-sprite](https://github.com/svg-sprite/svg-sprite) with lots of changes. There may still be outdated documentation and bugs. Please help by submitting a PR, it's very welcome :)

* Complete rewrite from CJS to ESM
* You need Node.js version >= 24
* Split package to `svgforge` and `svgforge-cli` for easier testing
* Replace glob with native Node.js glob
* Remove support for the sprite technique (CSS background position). I've found it antique and not required anymore and it simplifies the code a lot! If you want to use icons as `background-image` you can use the `stack` mode, and then: `background: url(icon.svg#ID)`
* because there is no background-position
* Finally all tests are fixed and use Node.js's native test runner instead of Jest
* The CLI now has tests.

It comes with a set of [Mustache](https://mustache.github.io/) templates for creating stylesheets in good ol' [CSS](https://www.w3.org/Style/CSS/). Tweaking the templates or even adding your own **custom output format** is really easy, just as switching on the generation of an **HTML example document** along with your sprite.

For an up-to-date list of browsers supporting [SVG in general](https://caniuse.com/svg) respectively [SVG fragment identifiers](https://caniuse.com/svg-fragment) in particular (required for `<defs>` and `<symbol>` sprites as well as SVG stacks) please refer to [caniuse.com](https://caniuse.com/).

## Table of contents

* [Installation](#installation)
* [Getting started](#getting-started)
  * [Usage pattern](#usage-pattern)
  * [Standard API](docs/api.md)
* [Configuration basics](#configuration-basics)
  * [General configuration options](#general-configuration-options)
  * [Output modes](#output-modes)
    * [Common mode properties](#common-mode-properties)
    * [Basic examples](#basic-examples)
  * [Output destinations](#output-destinations)
    * [Pre-processor formats and the sprite location](#pre-processor-formats-and-the-sprite-location)
  * [Full configuration documentation](docs/configuration.md)
  * [Online configurator & project kickstarter](https://svgforge.github.io/svgforge/)
* [Advanced techniques](#advanced-techniques)
  * [Meta data injection](docs/meta-data.md)
  * [Tweaking and adding output formats](docs/templating.md)
* [Command line usage](#command-line-usage)
* [Known problems / To-do](#known-problems--to-do)
* [Changelog](CHANGELOG.md)
* [Legal](#legal)


## Installation

To install *svgforge* globally, run:

```bash
npm install svgforge -g
```


## Getting started

Crafting a sprite with *svgforge* typically follows these steps:

1. You [create an instance of the SVGSpriter](docs/api.md#svgspriter-config-), passing a main configuration object to the constructor.
2. You [register a couple of SVG source files](docs/api.md#svgspriteraddfile--name-svg-) for processing.
3. You [trigger the compilation process](docs/api.md#svgspritercompile-config--callback-) and receive the generated files (sprite, CSS, example documents etc.).

The procedure is the very same for all supported sprite types («modes»).


### Usage pattern

```js
import fs from 'node:fs';
import path from 'node:path';
import SVGSpriter from 'svgforge';

// Define your configuration
const config = {
  // ...
};

// Create spriter instance
const spriter = new SVGSpriter(config);

// Add SVG source files
spriter.add(
  'assets/svg-1.svg',
  null,
  fs.readFileSync('assets/svg-1.svg', 'utf8')
);

spriter.add(
  'assets/svg-2.svg',
  null,
  fs.readFileSync('assets/svg-2.svg', 'utf8')
);

// Compile the sprite asynchronously
const { result } = await spriter.compileAsync();

// Write generated files to disk
for (const mode of Object.values(result)) {
  for (const resource of Object.values(mode)) {
    fs.mkdirSync(path.dirname(resource.path), { recursive: true });
    fs.writeFileSync(resource.path, resource.contents);
  }
}

```

As you can see, big parts of the above are dealing with disk I/O by writing the resulting [vinyl](https://github.com/gulpjs/vinyl) files to disk yourself.


## Configuration basics

Of course you noticed the `config` variable passed to the constructor in the above example. This is *svgforge*'s **main configuration** — an `Object` with the following properties:

```js
{
  dest: <String>, // Main output directory
  log: <String|Logger>, // Logging verbosity or custom logger
  shape: <Object>, // SVG shape configuration
  svg: <Object>, // Common SVG options
  variables: <Object>, // Custom templating variables
  mode: <Object> // Output mode configurations
}
```

If you don't provide a configuration object altogether, *svgforge* uses built-in defaults for these properties, so in fact, they are all optional. However, you will need to enable at least one **output mode** (`mode` property) to get reasonable results (i.e. a sprite of some type).


### General configuration options

Many configuration properties (all except `mode`) apply to all sprites created by the same spriter instance. The default values are:

```js
// Common svgforge config options and their default values
const config = {
  dest: '.', // Main output directory
  log: null, // Logging verbosity (default: no logging)
  shape: { // SVG shape related options
    id: { // SVG shape ID related options
      separator: '--', // Separator for directory name traversal
      generator: function () { /*...*/ }, // SVG shape ID generator callback
      pseudo: '~' // File name separator for shape states (e.g. ':hover')
    },
    dimension: {// Dimension related options
      maxWidth: 2000, // Max. shape width
      maxHeight: 2000, // Max. shape height
      precision: 2, // Floating point precision
      attributes: false, // Width and height attributes on embedded shapes
    },
    spacing: { // Spacing related options
      padding: 0, // Padding around all shapes
      box: 'content' // Padding strategy (similar to CSS `box-sizing`)
    },
    transform: ['svgo'], // List of transformations / optimizations
    meta: null, // Path to YAML file with meta / accessibility data
    align: null, // Path to YAML file with extended alignment data
    dest: null // Output directory for optimized intermediate SVG shapes
  },
  svg: { // General options for created SVG files
    xmlDeclaration: true, // Add XML declaration to SVG sprite
    doctypeDeclaration: true, // Add DOCTYPE declaration to SVG sprite
    namespaceIDs: true, // Add namespace token to all IDs in SVG shapes
    namespaceIDPrefix: '', // Add a prefix to the automatically generated namespaceIDs
    namespaceClassnames: true, // Add namespace token to all CSS class names in SVG shapes
    dimensionAttributes: true // Width and height attributes on the sprite
  },
  variables: {} // Custom Mustache templating variables and functions
}
```

Please refer to the [configuration documentation](docs/configuration.md) for details.


### Output modes

At the moment, *svgforge* supports **four different output modes** (i.e. sprite types), each of them has its own characteristics and use cases. It's up to you to decide which sprite type is the best choice for your project. The `mode` option controls which sprite types are created. You may enable more than one output mode at a time — *svgforge* will happily create several sprites in parallel.

To enable the creation of a specific sprite type with default values, simply set the appropriate `mode` property to `true`:

```js
const config = {
  mode: {
    view: true, // Create a «view» sprite
    defs: true, // Create a «defs» sprite
    symbol: true, // Create a «symbol» sprite
    stack: true // Create a «stack» sprite
  }
}
```

To further configure a sprite, pass in an object with configuration options:

```js
// «symbol» sprite with CSS stylesheet resource
const config = {
  mode: {
    symbol: {
      // Configuration for the «symbol» sprite
      // ...
    }
  }
}
```


#### Common mode properties

Many `mode` properties are shared between the different sprite types, but there are also type specific options. Please refer to the [configuration documentation](docs/configuration.md) for a complete list of settings.

```js
// Common mode properties
const config = {
  mode: {
    <mode>: {
      dest: "<mode>", // Mode specific output directory
      prefix: "svg-%s", // Prefix for CSS selectors
      dimensions: "-dims", // Suffix for dimension CSS selectors
      sprite: "svg/sprite.<mode>.svg", // Sprite path and name
      bust: true || false, // Cache busting (mode dependent default value)
      render: { // Stylesheet rendering definitions
        /* -------------------------------------------
        css: false, // CSS stylesheet options
        <custom>: ... // Custom stylesheet options
        -------------------------------------------  */
      },
      example: false // Create an HTML example document
    }
  }
}
```


#### Basic examples


##### A) Standalone sprite

Foreground image **sprite with `<symbol>` elements** (for being `<use>`d in your HTML source):

```js
// «symbol» sprite with CSS stylesheet resource
const config = {
  mode: {
    symbol: {    // Create a «symbol» sprite
      inline: true // Prepare for inline embedding
    }
  }
}
```


##### B) Sprite with CSS resource

**«defs» sprite** with a **CSS stylesheet**:

```js
// «defs» sprite with CSS stylesheet resource
const config = {
  mode: {
    defs: { // Create a «defs» sprite
      render: {
        css: true // Render a CSS stylesheet
      }
    }
  }
}
```


##### C) Multiple sprites

**`<defs>` sprite**, **`<symbol>` sprite** and an **SVG stack** all at once:

```js
// «defs», «symbol» and «stack» sprites in parallel
const config = {
  mode: {
    defs: true,
    symbol: true,
    stack: true
  }
}
```


##### D) No sprite at all

`mode`-less run, returning the **optimized SVG shapes only**:

```js
// Just optimize source SVG files, create no sprite
const config = {
  shape: {
    dest: 'path/to/out/dir'
  }
}
```


### Output destinations

Depending on your particular configuration, *svgforge* creates a lot of files that partly refer to each other. Several configuration options are controlling the exact location of each file, and you are well advised to spend a moment understanding how they interrelate with each other.

Relative destination paths refer to their ancestors as shown in the following scheme, with the current working directory being the ultimate base.

```text
    Destination option           Default         Comment
-------------------------------------------------------------------------------------------------------------------------------------------------------------
cwd $   <dest>/                .           Main output directory
      <mode.view.dest>/          view          «view» base directory
        <mode.view.sprite>       svg/sprite.view.svg  Sprite location
        (rendering resources are created by the respective modes, e.g. defs/symbol/stack)
      <mode.defs.dest>/          defs          «defs» base directory
        ...
      <mode.symbol.dest>/        symbol        «symbol» base directory
        ...
      <mode.stack.dest>/         stack         «stack» base directory
        ...
```

By default, stylesheet resources are generated directly into the respective **mode's base directory**.

> "Oh wait! Didn't you say that *svgforge* doesn't access the file system? So why do you need output directories at all?" — Well, good point. *svgforge* uses [vinyl](https://github.com/gulpjs/vinyl) file objects to pass along virtual resources and to specify where they **are intended to be located**. This is especially important for relative file paths (e.g. the path of an SVG sprite as used by a CSS stylesheet).


#### CSS resources and the sprite location

Special care needs to be taken when you create a sprite with a CSS stylesheet resource (the «defs», «symbol» and «stack» modes). In this case, calculating the correct relative SVG sprite path as used by the stylesheet can become tricky, as your final CSS file doesn't necessarily lie side by side with the sprite:

1. If you **truly configured CSS output**, *svgforge* uses your custom `mode.<mode>.render.css.dest` as the CSS stylesheet location.
2. If you just **enabled CSS output** by setting `mode.<mode>.render.css` to `true`, the default value applies, which is `mode.<mode>.dest / "sprite.css"`.
3. The same holds true when you **don't enable CSS output** at all. *svgforge* then simply assumes that the CSS file will be created where the defaults would put it, which is again `mode.<mode>.dest / "sprite.css"`.

So even if you don't enable plain CSS output explicitly, please make sure to set `mode.<mode>.dest` to **where your final CSS file is intended to be**.


### Full configuration documentation

The complete configuration documentation including all options [can be found here](docs/configuration.md).


## Advanced techniques


### Meta data injection

In order to improve accessibility, *svgforge* can read meta data from a YAML file and inject `<title>` and `<description>` elements into your SVGs. Please refer to the [meta data injection guide](docs/meta-data.md) for details.


### Tweaking and adding output formats

*svgforge* uses [Mustache](https://mustache.github.io/) templates for rendering the various CSS resources. This makes it very easy to tailor the generated CSS / Sass resources to your needs or add completely new output formats. Please refer to the [templating guide](docs/templating.md) to learn about the details.


## Command line usage

The command line interface has been split out into the separate [`svgforge-cli`](https://github.com/svgforge/svgforge-cli) package. Install it globally to get the `svgforge` command:

```bash
npm install svgforge-cli -g
```

A typical example could look like this:

```bash
svgforge --defs --defs-render-css --defs-example --dest=out assets/*.svg
```

Please refer to the [CLI guide](https://github.com/svgforge/svgforge-cli/docs/command-line.md) for further details.


## Known problems / To-do

* SVGO does not minify element IDs when there are `<style>` or `<script>` elements contained in the file


## Changelog

Please refer to the [GitHub releases](https://github.com/svgforge/svgforge/releases) for a complete release history.


## Legal

Copyright © 2026 Felix Müller. *svgforge* is licensed under the terms of the [MIT license](LICENSE). The original author is Joschi Kuphal <joschi@kuphal.net> / [@jkphl](https://twitter.com/jkphl). The contained example SVG icons are part of the [Tango Icon Library](http://tango.freedesktop.org/Tango_Icon_Library) and belong to the Public Domain.


[npm-url]: https://www.npmjs.com/package/svgforge
[npm-image]: https://img.shields.io/npm/v/svgforge?logo=npm&logoColor=fff
[npm-downloads]: https://img.shields.io/npm/dm/svgforge

[ci-url]: https://github.com/svgforge/svgforge/actions/workflows/test.yml?query=branch%3Amain
[ci-image]: https://img.shields.io/github/actions/workflow/status/svgforge/svgforge/test.yml?branch=main&label=CI&logo=github

[coveralls-url]: https://coveralls.io/github/svgforge/svgforge?branch=main
[coveralls-image]: https://img.shields.io/coveralls/github/svgforge/svgforge/main?logo=coveralls
