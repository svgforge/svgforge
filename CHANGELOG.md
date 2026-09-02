Newer release notes are published on the GitHub release page: <https://github.com/svgforge/svgforge/releases>

---

## Unreleased

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
  and copyright holder of the original svg-sprite codebase
* Replace the `glob` package with the native `fs.globSync`/`node:fs` API and
  drop `glob` from the (dev) dependencies; `engines.node` is `>= 22` (required
  for the glob API introduced in Node 22)
* Normalize the `file` and `name` arguments of `SVGSpriter.prototype.add()` via
  `path.normalize()` so both values use the same path separators (fixes
  svg-sprite/svg-sprite#942, per PR svg-sprite/svg-sprite#944); the now
  redundant `trimStart()` call on `name` was dropped

## 1.6.0-alpha Maintenance pre-release (2020-01-18)

* Remove support for Node < 8.0
* Update dependencies ([#306](https://github.com/svgforge/svgforge/pull/306), [#310](https://github.com/svgforge/svgforge/pull/310))
* Update documentation to use updated SVGO plugin name ([#275](https://github.com/svgforge/svgforge/pull/275))
* Move `mocha` and `should` dependencies back to `devDependencies` again ([#297](https://github.com/svgforge/svgforge/pull/297), [#285](https://github.com/svgforge/svgforge/issues/285))
* Add built-in templating function to encode hash signs ([#294](https://github.com/svgforge/svgforge/pull/294))
* Fix verbose logging output ([#279](https://github.com/svgforge/svgforge/issues/279), [#291](https://github.com/svgforge/svgforge/pull/291))
* Add option to prefix auto-generated namespace IDs ([#292](https://github.com/svgforge/svgforge/issues/292), [#293](https://github.com/svgforge/svgforge/issues/293))
* Update preview templates to use SVG checker image ([#287](https://github.com/svgforge/svgforge/pull/287))

## 1.5.0 Maintenance release (2018-09-18)

* Updated dependencies
* Dropped support for Node.js < 6.4

## 1.4.1 Maintenance release (2018-09-18)

* Updated dependencies ([#276](https://github.com/svgforge/svgforge/pull/276), [#277](https://github.com/svgforge/svgforge/pull/277))

## 1.4.0 Maintenance release (2018-03-17)

* Added more Node.js versions to Travis instructions
* Updated dependencies
* Updated SVGO version & test fixture ([#258](https://github.com/svgforge/svgforge/pull/258), [#259](https://github.com/svgforge/svgforge/issues/259))
* Reformatted documentation code examples ([#236](https://github.com/svgforge/svgforge/pull/236))
* Fix JSHint errors ([#261](https://github.com/svgforge/svgforge/pull/261))
* Add support for simple shape ID generator ([#240](https://github.com/svgforge/svgforge/pull/240))
* Add failing CPU detection workaround ([#252](https://github.com/svgforge/svgforge/issues/252))
* Changed SVGO plugin defaults ([#249](https://github.com/svgforge/svgforge/issues/249))

## 1.3.7 Bugfix release (2017-06-01)

* Updated dependencies
* Fixed invalid markup in `<defs>` example html ([#229](https://github.com/svgforge/svgforge/issues/229))
* Fallback for failing CPU detection ([#217](https://github.com/svgforge/svgforge/pull/217))
* Fixed broken SVGO configuration in CLI ([#216](https://github.com/svgforge/svgforge/pull/216), [#199](https://github.com/svgforge/svgforge/issues/199))
* Added glob base directory option to CLI ([#220](https://github.com/svgforge/svgforge/issues/220))
* Fixed broken `rootAttributes` option in CLI ([#228](https://github.com/svgforge/svgforge/issues/228))

## 1.3.6 Bugfix release (2016-08-29)

* Updated dependencies
* Fixed LESS template mixin call ([#187](https://github.com/svgforge/svgforge/pull/187))
* Fixed broken keyframe animation support

## 1.3.5 Bugfix release (2016-08-15)

* Fixed file name regression bug ([#186](https://github.com/svgforge/svgforge/issues/186))

## 1.3.4 Bugfix release (2016-08-12)

* Updated dependencies
* Extended the ID generator callback signature ([#176](https://github.com/svgforge/svgforge/issues/176))
* Improved usage pattern example ([#177](https://github.com/svgforge/svgforge/issues/177))
* Added support for mode shorthand definitions in CLI mode ([#183](https://github.com/svgforge/svgforge/issues/183))

## 1.3.3 Bugfix release (2016-04-28)

* Fixed CLI regression bug ([#173](https://github.com/svgforge/svgforge/issues/173))
* Fixed CLI root attributes file handling ([#144](https://github.com/svgforge/svgforge/issues/144))

## 1.3.2 Feature release (2016-04-27)

* Updated dependencies
* Restored documentation image ([#168](https://github.com/svgforge/svgforge/issues/168))
* Added CLI rendering options for defs/symbol/stack sprites ([#160](https://github.com/svgforge/svgforge/issues/160))
* Added CLI option for external JSON config file ([#160](https://github.com/svgforge/svgforge/issues/160), [#165](https://github.com/svgforge/svgforge/issues/165))

## 1.3.1 Bugfix release (2016-04-17)

* Fixed modeless run ([#158](https://github.com/svgforge/svgforge/issues/158))
* Fixed broken shape dimension attribute removal in symbol mode

## 1.3.0 Major maintenance release (2016-04-14)

* Updated dependencies
* ~~Tweaked .gitignore to ignore symlinked test files (closes #140)~~ Reverted & made the files real copies
* Updated documentation
* Removed redundant require ([#156](https://github.com/svgforge/svgforge/issues/156))
* Dropped support for Node.js < 4.0 and io.js
* Added explicit sprite size in example document ([#138](https://github.com/svgforge/svgforge/issues/138))
* Added XML entity resolution ([#118](https://github.com/svgforge/svgforge/issues/118))
* Allow multiple selectors for ID / class namespacing ([#109](https://github.com/svgforge/svgforge/issues/109))
* Switched to [patched svg2png](https://github.com/domenic/svg2png/pull/45) until media queries are properly supported (devDependencies)

## 1.2.19 Maintenance release (2016-01-11)

* Updated dependencies
* Temporarily fixed xmldom dependency problem ([#135](https://github.com/svgforge/svgforge/issues/135))

## 1.2.18 Maintenance release (2016-01-05)

* Updated dependencies
* Fixed inline embedding link in example templates ([#130](https://github.com/svgforge/svgforge/issues/130))
* Fixed broken Less mixin support ([#133](https://github.com/svgforge/svgforge/issues/133))
* Introduced support for custom shape orders ([#131](https://github.com/svgforge/svgforge/issues/131))

## 1.2.17 Maintenance release (2015-12-17)

* Updated dependencies

## 1.2.16 Maintenance release (2015-12-01)

* Updated dependencies
* Improved log level config handling ([#124](https://github.com/svgforge/svgforge/issues/124))
* Wrapped CSS `url()`s in quotes ([#125](https://github.com/svgforge/svgforge/issues/125))

## 1.2.15 Maintenance release (2015-11-24)

* Updated dependencies

## 1.2.14 Bugfix release (2015-11-17)

* Updated dependencies & test fixture
* Added Node.js versions 4 & 5 to Travis tests
* Fixed broken svg4everybody links ([#122](https://github.com/svgforge/svgforge/issues/122))

## 1.2.13 Maintenance release (2015-11-06)

* Updated dependencies
* Support for source files outside the cwd

## 1.2.12 Maintenance release (2015-10-24)

* Updated dependencies
* Dropped example file extension restriction ([#119](https://github.com/svgforge/svgforge/issues/119))

## 1.2.11 Maintenance release (2015-10-07)

* Updated dependencies

## 1.2.10 Maintenance release (2015-08-19)

* Updated dependencies
* Added browser compatibility hint ([#106](https://github.com/svgforge/svgforge/issues/106))
* Added accessibility features to symbol sprites ([#107](https://github.com/svgforge/svgforge/issues/107))

## 1.2.9 Bugfix release (2015-08-19)

* Updated dependencies
* Fixed broken `classname` rendering function ([#71](https://github.com/svgforge/svgforge/pull/71))

## 1.2.8 Feature release (2015-08-12)

* Updated dependencies
* Introduced CSS positioning values floating point precision ([#102](https://github.com/svgforge/svgforge/issues/102))

## 1.2.7 Maintenance release (2015-07-29)

* Updated dependencies
* Fixed error in symbol example template ([#99](https://github.com/svgforge/svgforge/pull/99))

## 1.2.6 Feature release (2015-07-17)

* Updated dependencies
* Added CSS class namespacing ([#42](https://github.com/svgforge/svgforge/issues/42))

## 1.2.5 Maintenance release (2015-06-24)

* Updated dependencies
* Changed sprite file name handling ([#97](https://github.com/svgforge/svgforge/issues/97))

## 1.2.4 Bugfix release (2015-06-17)

* Updated dependencies
* Fixed invalid SVG validation regex ([#94](https://github.com/svgforge/svgforge/issues/94))

## 1.2.3 Bugfix release (2015-06-08)

* Fixed string conversion regression ([#89](https://github.com/svgforge/svgforge/issues/89))
* Updated dependencies

## 1.2.2 Feature release (2015-06-05)

* Introduced "icon" box sizing strategy ([#57](https://github.com/svgforge/svgforge/pull/57))

## 1.2.1 Bugfix release (2015-06-04)

* Fixed broken npm publish settings

## 1.2.0 Feature release (2015-06-04)

* Updated dependencies & development dependencies ([#67](https://github.com/svgforge/svgforge/pull/67), [#82](https://github.com/svgforge/svgforge/issues/82))
* Relocated the shape transformations list config option
* Added custom root attributes support ([#87](https://github.com/svgforge/svgforge/issues/87))
* Introduced a global post-processing transformation option ([#64](https://github.com/svgforge/svgforge/issues/64), [#87](https://github.com/svgforge/svgforge/issues/87))

## 1.1.2 Bugfix release (2015-04-22)

* Fixed symbol example template regression bug ([#70](https://github.com/svgforge/svgforge/issues/70#issuecomment-95307588))
* Added mixin option to CLI arguments
* Fixed boolean CLI argument notation ([#76](https://github.com/svgforge/svgforge/issues/76))
* Added whitespace replacement for shape IDs ([#77](https://github.com/svgforge/svgforge/issues/77))

## 1.1.1 Bugfix release (2015-04-19)

* Updated dependencies & development dependencies
* Added viewBox attribute to SVG stacks ([#73](https://github.com/svgforge/svgforge/issues/73))
* Fixed example document path resolution bug ([#70](https://github.com/svgforge/svgforge/issues/70))
* Allow negative viewBox values ([#72](https://github.com/svgforge/svgforge/pull/72))
* Fixed symbol example document ([#71](https://github.com/svgforge/svgforge/pull/71))
* Improved error log for invalid SVG files ([#69](https://github.com/svgforge/svgforge/issues/69))

## 1.1.0 Maintenance release (2015-04-04)

* Updated dependencies & development dependencies
* Added mixin option ([#66](https://github.com/svgforge/svgforge/issues/66); ATTENTION: May break custom templates!)
* Node.js 0.12 compatibility

## 1.0.20 Bugfix release (2015-03-28)

* Updated dependencies
* Fixed several CLI bugs ([#65](https://github.com/svgforge/svgforge/issues/65))

## 1.0.19 Maintenance release (2015-03-08)

* Changed alias for `shape.dest` CLI option
* Updated dependencies
* Fixed ID bug with view sprites
* Fixed sprite CSS path calculation

## 1.0.18 Bugfix release (2015-02-20)

* Removed excessive console output

## 1.0.17 Maintenance release (2015-02-20)

* Optimized stylesheet templates
* Introduced boolean hasCommon template variable
* Updated dependencies
* Fixed incomplete dimension CSS selector suffix

## 1.0.16 Bugfix release (2015-02-11)

* Fixed broken previous release

## 1.0.15 Bugfix release (2015-02-11)

* Fixed missing file extensions with CSS resources ([#54](https://github.com/svgforge/svgforge/issues/54))
* Fixed broken sprite URL in css/view example HTML documents ([#53](https://github.com/svgforge/svgforge/issues/53))
* Fixed wrong base path for intermediate SVG shapes
* Removed the automatic dot prefix for CSS selectors ([#55](https://github.com/svgforge/svgforge/issues/55))

## 1.0.14 Maintenance release (2015-02-08)

* Restructured documentation
* Updated dependencies
* Fixed error with falsy rendering configurations ([#52](https://github.com/svgforge/svgforge/issues/52))

## 1.0.13 Maintenance release (2015-01-28)

* Fixed windows path separator bug
* Made dimension attributes (width & height) optional ([#45](https://github.com/svgforge/svgforge/issues/45))
* Added cache busting option for non-CSS sprites ([#48](https://github.com/svgforge/svgforge/issues/48))

## 1.0.12 Feature release (2015-01-27)

* Added dimension CSS output for non-CSS sprites ([#45](https://github.com/svgforge/svgforge/issues/45))
* Bumped lodash dependency version (#44)

## 1.0.11 Bugfix release

* Fixed coordinate distortion in CSS sprites ([#41](https://github.com/svgforge/svgforge/issues/41))

## 1.0.10 Maintenance release

* Added support for custom mode keys
* Fixed external CLI transform configuration support
* Fixed typos in README example ([PR #39](https://github.com/svgforge/svgforge/pull/39))
* Added support for Windows file name globbing ([#40](https://github.com/svgforge/svgforge/issues/40))

## 1.0.9 Maintenance release

* Updated dependencies
* Introduced `svg` getter in templating shape variables
* Fixed broken dimension argument in CLI version ([#38](https://github.com/svgforge/svgforge/issues/38))
* Fixed logging error in SVGO optimization
* Fixed missing XML namespaces in SVG stack
* Fixed cache busting errors with example HTML document

## 1.0.8 Bugfix release

* Fixed broken rendering template path resolution

## 1.0.7 Feature release

* Improved error handling
* Improved XML & DOCTYPE declaration handling and fixed

## 1.0.6 Feature release

* Made shape ID namespacing configurable
* Added extended alignment options ([#33](https://github.com/svgforge/svgforge/issues/33))

## 1.0.5 Bufix release

* Fixed regression bug with SVG stacks
* Added support for ID generator templates in CLI version ([#37](https://github.com/svgforge/svgforge/issues/37))

## 1.0.4 Bufix release

* Fixed XML & doctype declaration bug with inline sprites
* Added support for ID generator templates ([#37](https://github.com/svgforge/svgforge/issues/37))

## 1.0.3 Bufix release

* Fixed dependency error ([#36](https://github.com/svgforge/svgforge/issues/36))

## 1.0.2 Maintenance release

* Improved error handling

## 1.0.1 Maintenance release

* Updated module dependencies

## 1.0.0 Next generation release

* Rewritten from scratch ([#23](https://github.com/svgforge/svgforge/issues/23), [#30](https://github.com/svgforge/svgforge/issues/30))
* Dropped [libxmljs](https://github.com/polotek/libxmljs) dependency for improving Windows support
* Added support for `view`, `symbol` and `stack` modes ([#27](https://github.com/svgforge/svgforge/issues/27), [#35](https://github.com/svgforge/svgforge/issues/35))
* Strip off all file access methods, making the module a good basis for 3rd party tools ([#21](https://github.com/svgforge/svgforge/issues/21), [#25](https://github.com/svgforge/svgforge/issues/25))
* Improved command line version ([#34](https://github.com/svgforge/svgforge/issues/34))
* Switched to relative positioning in CSS sprites
* Made the configuration of Mustache templates and destinations more intuitive
* Enabled customization of shape IDs
* Enabled custom SVG transformations
* Enhanced `padding` options ([#24](https://github.com/svgforge/svgforge/issues/24))
* Added cache busting for `css` and `view` mode (enabled by default; [#29](https://github.com/svgforge/svgforge/pull/29))
* Added support for [meta data injection](#a1-meta-data-injection)

For older release notes please [see here](https://github.com/svgforge/svgforge/tree/bbd051e940e7b6373ed56277251a8affb03b1c10#release-history).

# About

The [original svgforge](https://github.com/svgforge/svgforge/tree/bbd051e940e7b6373ed56277251a8affb03b1c10) was my first-ever Node.js module and featured CSS sprites only. The `1.0` release is **rewritten from scratch** and introduces a bunch of new features like **less dependencies** (for improved Mac OS and Windows compatibility), support for **inline sprite formats** and the **removal of file-system access** so that other libraries can build on top of it more easily. Derived libraries include:

* [svgforge-data](https://github.com/shakyShane/svgforge-data) by [Shane Osbourne](https://github.com/shakyShane) (based on the original svgforge)

**_iconizr_**, another project of mine, is based on *svgforge* and adds PNG fallbacks for the sprites so you can use them as universal icon systems for websites ([Node.js module](https://github.com/jkphl/node-iconizr), [PHP version](https://github.com/jkphl/iconizr) and [online service](https://iconizr.com/)).
