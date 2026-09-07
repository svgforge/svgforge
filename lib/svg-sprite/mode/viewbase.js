/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svg-sprite/svg-sprite
 @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 @copyright © 2018 Joschi Kuphal
 @license MIT https://github.com/joeda1/svgforge/blob/main/LICENSE
 */

import {format} from 'node:util';
import {isString} from '../utils/index.js';
import SVGSpriteBase from './base.js';
/**
 <view> sprite layout base
 */
class SVGSpriteViewBase extends SVGSpriteBase {
  /**
   Initialization (non-CSS modes)

   @returns {void}
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _init() {
    // Initialize the sprite dimensions
    this.data.spriteWidth = 0;
    this.data.spriteHeight = 0;

    // Prepare the dimension suffix
    this.config.dimensions = isString(this.config.dimensions) ? this.config.dimensions.trim() : '-dims';
    this.config.dimensions &&= /%s/u.test((this.config.dimensions || '').replaceAll('%%', ''))
      ? format(this.config.dimensions, this.config.prefix)
      : this.config.prefix + this.config.dimensions;
  }

  /**
   Layout the sprite

   @param {Array} files Sprite files being populated
   @param {(error: Error|null) => void} cb Node-style completion callback
   @returns {void}
   */
  layout(files, cb) {
    // Layout the sprite
    const config = this._layout();

    // Build the sprite SVG file
    files.sprite = this._buildSVG(config.xmlDeclaration || '', config.doctypeDeclaration || '');
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

  /**
  Layout the sprite (internal)

  @returns {object} Sprite configuration
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _layout() {
    // Place the shapes in a simple row
    this._layoutSimple();

    // Refine the shape data
    let xmlDeclaration = null;
    let doctypeDeclaration = null;

    for (const [index, shape] of this.data.shapes.entries()) {
      xmlDeclaration ||= this._spriter._shapes[index].xmlDeclaration;
      doctypeDeclaration ||= this._spriter._shapes[index].doctypeDeclaration;

      // Rework zero-valued positions
      const svg = shape.svg.split('>');
      const positionX = shape.position.absolute.x;
      const positionY = shape.position.absolute.y;

      // Replace zero-valued x-positions
      const svgX = svg[0].split(' x="0"');
      if (svgX.length > 1) {
        svg[0] = svgX.join(positionX ? ` x="${-positionX}"` : '');
      }

      // Replace zero-valued y-positions
      const svgY = svg[0].split(' y="0"');
      if (svgY.length > 1) {
        svg[0] = svgY.join(positionY ? ` y="${-positionY}"` : '');
      }

      shape.svg = svg.join('>');
    }

    return {xmlDeclaration, doctypeDeclaration};
  }

  /**
  Layout the sprite as a simple horizontal row of shapes

  @returns {SVGSpriteViewBase} Self reference
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _layoutSimple() {
    const lastShapeIndex = this._spriter._shapes.length - 1;
    let x = 0;
    const y = 0;

    // Run through all shapes and add them to the sprite
    for (const [index, shape] of this._spriter._shapes.entries()) {
      const dimensions = shape.getDimensions();
      const rootAttributes = {id: shape.id, x, y};

      this.data.spriteWidth = Math.max(this.data.spriteWidth, Math.ceil(x + dimensions.width));
      this.data.spriteHeight = Math.max(this.data.spriteHeight, Math.ceil(y + dimensions.height));

      this._addShapeData(
        shape,
        index,
        // eslint-disable-next-line no-bitwise -- The position encodes the first/last shape flags as a bitmask.
        (index === 0 ? 1 : 0) | (index === lastShapeIndex ? 2 : 0),
        this._refineRootAttributes(shape, index, rootAttributes),
        -x,
        -y,
      );

      x += dimensions.width;
    }

    return this;
  }

  /**
  Refine the root attributes set on each nested shape

  @param {SVGShape} shape Shape whose root attributes are refined
  @param {number} index Zero-based shape index
  @param {object} rootAttributes Root element attributes
  @returns {object} Refined root element attributes
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _refineRootAttributes(shape, index, rootAttributes) {
    return rootAttributes;
  }

  /**
  Add a single shape's data to the sprite

  @param {SVGShape} shape Shape to add to the sprite
  @param {number} index Zero-based shape index
  @param {number} position Position bits
  @param {object} rootAttributes Root element attributes
  @param {number} positionX Horizontal position within the sprite
  @param {number} positionY Vertical position within the sprite
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields, max-params -- Each param is a distinct coordinate/config value used once in the sprite table; grouping into one object would obscure the flow.
  _addShapeData(shape, index, position, rootAttributes, positionX, positionY) {
    // Register the SVG parameters
    this.data.shapes[index] = {
      ...this.data.shapes[index],
      // eslint-disable-next-line no-bitwise -- The position encodes the first/last shape flags as a bitmask.
      first: Boolean(position & 1),
      // eslint-disable-next-line no-bitwise -- The position encodes the first/last shape flags as a bitmask.
      last: Boolean(position & 2),
      position: {
        absolute: {
          x: positionX,
          y: positionY,
        },
      },
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

    // Create the SVG getter/setter
    Object.defineProperties(this.data.shapes[index], {
      _svg: {
        enumerable: false,
        writable: true,
      },
      svg: {
        get() {
          return this._svg || shape.getSVG(true, shapeDOM => {
            for (const [attribute, value] of Object.entries(rootAttributes)) {
              shapeDOM.setAttribute(attribute, value);
            }
          });
        },
        set(svg) {
          this._svg = svg;
        },
      },
    });
  }
}

/**
 Module export
 */
export default SVGSpriteViewBase;
