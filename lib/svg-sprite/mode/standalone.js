
/**
 Svg-sprite is a Node.js module for creating SVG sprites

 @see https://github.com/svg-sprite/svg-sprite
 @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 @copyright © 2018 Joschi Kuphal
 @license MIT https://github.com/joeda1/svgforge/blob/main/LICENSE
 */

import {format} from 'node:util';
import {isString} from '../utils/index.js';
import SVGSpriteBase from './base.js';
/**
 Base class for non-css sprites
 */
class SVGSpriteStandalone extends SVGSpriteBase {
  /**
   Initialization (non-CSS modes)

   @returns {void}
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _init() {
  // Prepare the dimension suffix
    this.config.dimensions = isString(this.config.dimensions) ? this.config.dimensions.trim() : '-dims';
    this.config.dimensions &&= /%s/u.test((this.config.dimensions || '').replaceAll('%%', ''))
      ? format(this.config.dimensions, this.config.prefix)
      : this.config.prefix + this.config.dimensions;

    this.data.inline = Boolean(this.config.inline);
  }

  /**
   Layout the sprite

   @param {Array} files Sprite files being populated
   @param {(error: Error|null) => void} cb Node-style completion callback
   @param {(shape: SVGShape, dataShape: object, index: number) => void} extend Per-shape extension callback
   @returns {void}
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _layout(files, cb, extend) {
  // Refine the shape data
    let xmlDeclaration = null;
    let doctypeDeclaration = null;

    for (const [index, shape] of this._spriter._shapes.entries()) {
    // Skip non-master shapes
      if (shape.master) {
        continue;
      }

      xmlDeclaration ||= shape.xmlDeclaration;
      doctypeDeclaration ||= shape.doctypeDeclaration;

      this.data.shapes[index] = {
        ...this.data.shapes[index],
        selector: {
          dimensions: shape.state
            ? [{
              expression: `${format(this.config.dimensions, shape.base)}:${shape.state}`,
              raw: `${format(this.config.dimensions, shape.base)}:${shape.state}`,
              first: true,
              last: false,
            }, {
              expression: format(this.config.dimensions, String.raw`${shape.base}\:${shape.state}`),
              raw: format(this.config.dimensions, `${shape.base}:${shape.state}`),
              first: false,
              last: true,
            }]
            : [{
              expression: format(this.config.dimensions, shape.base),
              raw: format(this.config.dimensions, shape.base),
              first: true,
              last: true,
            }],
        },
      };

      // Create the SVG setter and the getter/setter pair
      Object.defineProperties(this.data.shapes[index], {
        _svg: {
          enumerable: false,
          writable: true,
        },
        svg: {
          enumerable: true,
          configurable: true,
          get() {
            return this._svg;
          },
          set(svg) {
            this._svg = svg;
          },
        },
      });

      extend(shape, this.data.shapes[index], index);
    }

    // Remove all non-master shapes
    this.data.shapes = this.data.shapes.filter(shape => !shape.master);

    // Build the sprite SVG file
    files.sprite = this._buildSVG(xmlDeclaration || '', doctypeDeclaration || '');
    this._spriter.verbose('Created «%s» SVG sprite file («%s» mode)', this.key, this.mode);

    // Build the configured CSS resources
    this._buildCSSResources(files, error => {
      if (error) {
        cb(error);
      } else {
        this._buildHTMLExample(files, cb);
      }
    });
  }
}

/**
 Module export
 */
export default SVGSpriteStandalone;
