/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import SVGSpriteView from './view/index.js';
import SVGSpriteDefs from './defs.js';
import SVGSpriteSymbol from './symbol.js';
import SVGSpriteStack from './stack.js';

/**
 Single source of truth for the supported sprite modes: the class that renders
 the mode and the defaults merged into the user configuration.

 @type {object}
 */
const modes = {
  view: {
    Class: SVGSpriteView,
    defaults: {
      dest: 'view',
      prefix: '.svg-%s',
      sprite: 'svg/sprite.view.svg',
      bust: true,
    },
  },
  defs: {
    Class: SVGSpriteDefs,
    defaults: {
      dest: 'defs',
      prefix: '.svg-%s',
      dimensions: '-dims',
      sprite: 'svg/sprite.defs.svg',
      inline: false,
      example: false,
      bust: false,
    },
  },
  symbol: {
    Class: SVGSpriteSymbol,
    defaults: {
      dest: 'symbol',
      prefix: '.svg-%s',
      dimensions: '-dims',
      sprite: 'svg/sprite.symbol.svg',
      inline: false,
      example: false,
      bust: false,
    },
  },
  stack: {
    Class: SVGSpriteStack,
    defaults: {
      dest: 'stack',
      prefix: '.svg-%s',
      dimensions: '-dims',
      sprite: 'svg/sprite.stack.svg',
      example: false,
      bust: false,
    },
  },
};

/**
 Supported mode identifiers

 @type {Set<string>}
 */
export const spriteTypes = new Set(Object.keys(modes));

export default modes;
