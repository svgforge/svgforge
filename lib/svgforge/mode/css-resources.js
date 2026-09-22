/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {Buffer} from 'node:buffer';
import defaultFs from 'node:fs';
import File from 'vinyl';
import {getDependency} from '../../deps.js';
import {runParallelLimit} from '../utils/index.js';
import {renderTemplate} from '../utils/template.js';

/**
 Build the configured CSS resources

 @param {Array} files Sprite files being populated
 @param {(error: Error|null) => void} cb Node-style completion callback
 @returns {void}
 */
export function _buildCSSResources(files, cb) {
  const createResourceTask = (renderConfig, data, spriter, ext) => _cb => {
    (async () => {
      const template = getDependency('node:fs:readFileSync', defaultFs.readFileSync).call(defaultFs, renderConfig.template, 'utf8');
      const out = await getDependency('template:render', renderTemplate)(template, data);

      if (out.length > 0) {
        files[ext] = new File({
          base: spriter.config.dest,
          path: renderConfig.dest,
          contents: Buffer.from(out),
        });
        spriter.verbose('Created «%s» stylesheet resource', ext);
      }

      _cb(null);
    })().catch(error => _cb(error));
  };

  const tasks = [];

  if (this.config.render) {
    for (const [extension, value] of Object.entries(this.config.render)) {
      tasks.push(createResourceTask(value, this.data, this._spriter, extension));
    }
  }

  runParallelLimit(tasks, this._spriter._limit, cb);
}
