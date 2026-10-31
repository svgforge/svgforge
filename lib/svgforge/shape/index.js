/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import SVGShape from './shape.js';

/**
 Module factory creating an SVGShape instance

 @param {File} file Vinyl file
 @param {SVGSpriter} spriter Spriter instance
 @returns {SVGShape} SVGShape instance
 */
export default function createShape(file, spriter) {
  return new SVGShape(file, spriter);
}
