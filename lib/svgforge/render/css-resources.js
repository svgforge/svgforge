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
import {runParallelLimit} from '../utils/index.js';
import {renderTemplate} from '../utils/template.js';

/**
 Build the configured CSS resources

 @param {SVGSprite} mode Sprite mode instance
 @param {object} files Sprite files being populated
 @returns {Promise<void>}
 */
export async function _buildCSSResources(mode, files) {
  const tasks = [];

  if (mode.config.render) {
    for (const [extension, renderConfig] of Object.entries(mode.config.render)) {
      tasks.push(async () => {
        const out = await getDependency(dependencyKeys.templateRender, renderTemplate)(renderConfig.template, mode.data);

        if (out.length === 0) {
          return;
        }

        files[extension] = new SpriteFile({
          base: mode._spriter.config.dest,
          path: renderConfig.dest,
          contents: Buffer.from(out),
        });
        mode._spriter.verbose('Created «%s» stylesheet resource', extension);
      });
    }
  }

  await runParallelLimit(tasks, mode._spriter._limit);
}
