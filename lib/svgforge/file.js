/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import path from 'node:path';

export default class SpriteFile {
  constructor({base, path: filePath, contents} = {}) {
    this.path = filePath;
    this.base = base === undefined && filePath !== undefined ? path.dirname(filePath) : base;
    this.contents = contents;
  }

  get relative() {
    return path.relative(this.base, this.path);
  }
}
