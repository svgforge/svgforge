
/**
 * svg-sprite is a Node.js module for creating SVG sprites
 *
 * @see https://github.com/svg-sprite/svg-sprite
 * @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 * @copyright © 2018 Joschi Kuphal
 * @license MIT https://github.com/joeda1/svgforge/blob/main/LICENSE
 */

import SVGSprite from '../sprite.js';
import SVGSpriteStandalone from './standalone.js';
/**
 * <defs> sprite
 */
class SVGSpriteDefs extends SVGSpriteStandalone {
  /**
   * Mode name
   *
   * @returns {string} Mode name
   */
  get mode() {
    return 'defs';
  }

  /**
   * SVGSpriteDefs
   *
   * @param {SVGSpriter} spriter SVG spriter
   * @param {object} config Configuration
   * @param {object} data Base data
   * @param {string} key Mode key
   */
  constructor(spriter, config, data, key) {
    super(spriter, config, data, key);
  }

  /**
   * Layout the sprite
   *
   * @param {Array} files Files
   * @param {Function} cb Callback
   * @returns {void}
   */
  layout(files, cb) {
  this._layout(files, cb, (shape, dataShape) => {
    const dimensionAttributes = shape.config.dimension.attributes;

    // Create the SVG getter
    Object.defineProperty(dataShape, 'svg', {
      get() {
        return this._svg || shape.getSVG(true, shapeDOM => {
          shapeDOM.setAttribute('id', shape.id);

          if (!dimensionAttributes) {
            shapeDOM.removeAttribute('width');
            shapeDOM.removeAttribute('height');
          }
        });
      },
    });
  });
  }

  /**
   * Build the CSS sprite
   *
   * @param {string} xmlDeclaration XML declaration
   * @param {string} doctypeDeclaration Doctype declaration
   * @returns {File} SVG sprite file
   */
  _buildSVG(xmlDeclaration, doctypeDeclaration) {
  const isInline = Boolean(this.config.inline);
  const defaultRootAttributes = {...this.config.svg.rootAttributes};
  const rootAttributes = isInline
    ? {
      ...defaultRootAttributes,
      ...(this.config.svg.dimensionAttributes && {width: 0, height: 0}),
      style: 'position:absolute',
    }
    : defaultRootAttributes;
  const _xmlDeclaration = isInline ? '' : this.declaration(this.config.svg.xmlDeclaration, xmlDeclaration);
  const _doctypeDeclaration = isInline ? '' : this.declaration(this.config.svg.doctypeDeclaration, doctypeDeclaration);

  const svg = new SVGSprite(_xmlDeclaration, _doctypeDeclaration, rootAttributes, !isInline, this.config.svg.transform);

  svg.add('<defs>');
  svg.add(Object.keys(this.data.shapes).map(key => this.data.shapes[key].svg));
  svg.add('</defs>');

  return svg.toFile(this._spriter.config.dest, this._addCacheBusting(svg));
  }
}

/**
 * Module export
 */
export default SVGSpriteDefs;
