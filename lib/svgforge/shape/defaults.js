/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import path from 'node:path';
import {format} from 'node:util';

/**
 Default callback for shape ID generation

 @param {string} template Template string
 @returns {string} Shape ID
 */
export const createIdGenerator = template => {
  /**
   ID generator

   @param {string} name Relative file path
   @returns {string} Shape ID
   */
  const generator = function (name) {
    const pathname = this.separator ? name.split(path.sep).join(this.separator) : name;
    return format(template || '%s', path.basename(pathname.replaceAll(/\s+/gu, () => this.whitespace), '.svg'));
  };

  return generator;
};

/**
 Default shape configuration

 @type {object}
 */
const defaultConfig = {
  /**
   Shape ID related options

   @type {object}
   */
  id: {
    /**
     ID part separator (used for directory-to-ID traversal)

     @type {string}
     */
    separator: '--',
    /**
     Pseudo selector separator

     @type {string}
     */
    pseudo: '~',
    /**
     Whitespace replacement string

     @type {string}
     */
    whitespace: '_',
    /**
      ID traversal callback

      @param {(name: string, file: File) => string} generator
      */
    generator: createIdGenerator('%s'),
  },
  /**
   Dimension related options

   @type {object}
   */
  dimension: {
    /**
     Max. shape width

     @type {number}
     */
    maxWidth: 2000,
    /**
     Max. shape height

     @type {number}
     */
    maxHeight: 2000,
    /**
     Coordinate decimal places

     @type {number}
     */
    precision: 2,
    /**
     Add dimension attributes

     @type {boolean}
     */
    attributes: false,
  },
  /**
   Spacing related options

   @type {number}
   */
  spacing: {
    /**
     Padding around the shape

     @type {number | Array}
     */
    padding: {
      top: 0, right: 0, bottom: 0, left: 0,
    },
    /**
     Box sizing strategy

     Might be 'content' (padding is added outside of the shape), 'padding' (shape plus padding will make for the given maximum size)
     or 'contain' (like 'padding', but size will be fixed instead of maximum)

     @type {string}
     */
    box: 'content',
  },
};

export default defaultConfig;
