/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import SVGSprite from '../../sprite.js';
import SVGSpriteViewLayout from './layout.js';
/**
 <view> sprite
 */
class SVGSpriteView extends SVGSpriteViewLayout {
  /**
   Mode name

   @returns {string} Mode name
   */
  get mode() {
    return 'view';
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
    // Remove the ID attribute
    delete rootAttributes.id;

    return rootAttributes;
  }

  /**
   Build the CSS sprite

   @param {string} xmlDeclaration Declaration string prepended to the sprite
   @param {string} doctypeDeclaration Doctype string prepended after the XML declaration
   @returns {File} SVG sprite file
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _buildSVG(xmlDeclaration, doctypeDeclaration) {
    const rootAttributes = {
      ...this.config.svg.rootAttributes,
      ...(this.config.svg.dimensionAttributes && {
        width: this.data.spriteWidth,
        height: this.data.spriteHeight,
      }),
      viewBox: `0 0 ${this.data.spriteWidth} ${this.data.spriteHeight}`,
    };
    const _xmlDeclaration = this.declaration(this.config.svg.xmlDeclaration, xmlDeclaration);
    const _doctypeDeclaration = this.declaration(this.config.svg.doctypeDeclaration, doctypeDeclaration);

    const svg = new SVGSprite(_xmlDeclaration, _doctypeDeclaration, rootAttributes, true, this.config.svg.transform);

    for (const shape of this.data.shapes) {
      const viewBox = [
        -shape.position.absolute.x,
        -shape.position.absolute.y,
        shape.width.outer,
        shape.height.outer,
      ];

      svg.add(`<view id="${shape.name}" viewBox="${viewBox.join(' ')}"/>`);
      svg.add(shape.svg);
    }

    return svg.toFile(this._spriter.config.dest, this._addCacheBusting(svg));
  }
}

/**
 Module export
 */
export default SVGSpriteView;
