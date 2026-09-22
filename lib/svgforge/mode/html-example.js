/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {Buffer} from 'node:buffer';
import defaultFs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import File from 'vinyl';
import {getDependency} from '../../deps.js';
import {renderTemplate} from '../utils/template.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 Load the shared HTML example partials

 @returns {object} Partial templates keyed by name
 */
export function _loadHTMLExamplePartials() {
  const readPartial = file => {
    try {
      return getDependency('node:fs:readFileSync', defaultFs.readFileSync).call(defaultFs, path.resolve(packageRoot, path.join('tmpl', 'common', file)), 'utf8');
    } catch {
      return '';
    }
  };

  return {
    'figcaption.vto': readPartial('figcaption.vto'),
    'preview-css': readPartial('preview.css'),
    'preview-js': readPartial('preview.js'),
    'footer.vto': readPartial('footer.vto'),
  };
}

/**
 Build the HTML example file (non-CSS modes)

 @param {Array} files Sprite files being populated
 @param {(error: Error|null, data: object) => void} cb Node-style completion callback
 @returns {void}
 */
export function _buildHTMLExample(files, cb) {
  if (this.config.example) {
    (async () => {
      const template = getDependency('node:fs:readFileSync', defaultFs.readFileSync).call(defaultFs, this.config.example.template, 'utf8');
      const out = await getDependency('template:render', renderTemplate)(template, this.data, this._loadHTMLExamplePartials());
      if (out.length > 0) {
        files.example = new File({
          base: this._spriter.config.dest,
          path: this.config.example.dest,
          contents: Buffer.from(out),
        });
        this._spriter.verbose('Created «%s» HTML example file', this.key);
      }

      cb(null, this.data);
    })().catch(error => cb(error));
  } else {
    cb(null, this.data);
  }
}
