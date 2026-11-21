/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {Buffer} from 'node:buffer';
import SpriteFile from '../file.js';
import {dependencyKeys, getDependency} from '../../deps.js';
import {renderTemplate} from '../utils/template.js';

/**
 Build the HTML example file

 @param {SVGSprite} mode Sprite mode instance
 @param {object} files Sprite files being populated
 @returns {Promise<object>} Mode data
 */
export async function _buildHTMLExample(mode, files) {
  if (mode.config.example) {
    const out = await getDependency(dependencyKeys.templateRender, renderTemplate)(mode.config.example.template, mode.data);
    if (out.length > 0) {
      files.example = new SpriteFile({
        base: mode._spriter.config.dest,
        path: mode.config.example.dest,
        contents: Buffer.from(out),
      });
      mode._spriter.verbose('Created «%s» HTML example file', mode.key);
    }
  }

  return mode.data;
}
