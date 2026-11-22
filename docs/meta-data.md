# svgforge

This file is part of the documentation of *svgforge* — a free low-level Node.js module that **takes a bunch of SVG files**, optimizes them and creates **SVG sprites** of several types. The package is [hosted on GitHub](https://github.com/svgforge/svgforge).


## Accessibility

### Meta data injection

By providing a simple [YAML](https://yaml.org/) file via the `shape.meta` configuration property, you can **inject titles and descriptions** into your SVG files before they get compiled as a sprite. Doing so may improve the accessibility of your SVGs. Please see the articles by [The Paciello Group](https://www.tpgi.com/using-aria-enhance-svg-accessibility/) and [Jonathan Neal](https://github.com/jonathantneal/svg4everybody#readability-and-accessibility) on how to use your SVG sprites in a most accessible way.

By default, `shape.accessibility.autoTitle` is `true`: if no meta title is present, svgforge generates a `<title>` from the shape name. Shapes with an accessible name get `aria-labelledby` and `role="img"` unless a `role` is already set. Inline `symbol`/`defs` sprite roots default to `aria-hidden="true"` and `focusable="false"` (override via `svg.rootAttributes`).

#### File structure

The YAML file needs to look like this:

```yaml
"path/to/rectangle.svg":
  title: "Green rectangle"
  description: "A light green rectangle with rounded corners and a dark green border"

path--to--circle:
  title: "Red circle"
  description: "A red circle with a black border"
```

The keys need to match either

* the **"local" file path part** of the SVG files you [register to the spriter](api.md#svgspriteraddfile--name-svg-) or
* the final **shape IDs / CSS class names** as returned by the `id.generator` function.

#### SVG results

For each of your shapes, *svgforge* will look for `title` and `description` keys and inject their values like this:

```xml
<svg aria-labelledby="title desc" role="img">
  <title id="title">Green rectangle</title>
  <desc id="desc">A light green rectangle with rounded corners and a dark green border</desc>
  <rect width="75" height="50" rx="20" ry="20" fill="#90ee90" stroke="#228b22" stroke-fill="1" />
</svg>
```

Existing `<title>` and `<desc>` elements from meta data override the generated metadata. Even without a `meta` file, svgforge uses existing `<title>`/`<desc>` elements, sets `aria-labelledby` when an accessible name exists, and may generate a title when `shape.accessibility.autoTitle` is enabled.
