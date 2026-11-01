/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {isObject, deepMerge} from '../utils/index.js';
import ArgumentError from '../errors/argument-error.js';
import {_buildCSSResources as buildCSSResources} from '../render/css-resources.js';
import {_buildHTMLExample as buildHTMLExample} from '../render/html-example.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 Sprite base class
 */
class SVGSpriteBase {
  /**
   Create the sprite mode instance from a spriter, its configuration and base data

   @param {SVGSpriter} spriter SVG spriter
   @param {object} config Configuration
   @param {object} data Base rendering data
   @param {string} key Sprite mode identifier
   */
  constructor(spriter, config, data, key) {
    this._spriter = spriter;
    this.config = config;
    this.key = key || this.mode;
    this.data = data;
    this.data.mode = this.mode;
    this.data.key = this.key;

    // Resolve file paths
    this.config.dest = path.resolve(this._spriter.config.dest, this.config.dest);

    if ('sprite' in this.config) {
      const spritePath = path.dirname(this.config.sprite);
      let spriteName = path.basename(this.config.sprite) || 'sprite';

      if (!spriteName.includes('.')) {
        spriteName += '.svg';
      }

      this.config.sprite = path.resolve(this.config.dest, path.join(spritePath, spriteName));
    }

    // Prepare the rendering configurations
    if ('render' in this.config && isObject(this.config.render)) {
      for (const [extension, value] of Object.entries(this.config.render)) {
        const folder = path.dirname(path.dirname(path.dirname(__dirname)));
        const file = path.join('tmpl', this.tmpl, `sprite.${extension}.vto`);
        const renderConfig = {
          template: path.resolve(folder, file),
          dest: path.join(this.config.dest, `sprite.${extension}`),
        };

        if (isObject(value)) {
          if ('template' in value) {
            renderConfig.template = path.resolve(process.cwd(), value.template);
          }

          if ('dest' in value) {
            renderConfig.dest = path.resolve(this.config.dest, value.dest);
            renderConfig.dest = new RegExp(String.raw`\.${extension}$`, 'iu').test(renderConfig.dest)
              ? renderConfig.dest
              : `${renderConfig.dest}.${extension}`;
          }
        } else if (value !== true) {
          delete this.config.render[extension];
          continue;
        }

        this.config.render[extension] = renderConfig;
      }
    }

    this._cssDest = this.config.dest;

    // Cache busting
    this.config.bust = Boolean(this.config.bust);

    // Prepare the CSS prefix
    this.config.prefix = this.config.prefix.trim();
    if (!/%s/u.test(this.config.prefix.replaceAll('%%', ''))) {
      this.config.prefix += '%s';
    }

    // Refine the base data
    this.data = deepMerge(this.data, this._initData({
      padding: this._spriter.config.shape.spacing.padding,
      sprite: path.relative(this._cssDest, this.config.sprite).split(path.sep).join('/'),
    }));

    this._init();
  }

  /**
   Mode name

   Concrete subclasses override this getter.

   @returns {string} Mode name
   */
  get mode() {
    return undefined;
  }

  /**
   Template folder

   @returns {string} Template folder
   */
  get tmpl() {
    return 'common';
  }

  /**
   Initialization (no-op by default)

   @returns {void}
   */
  _init() {}

  /**
   Extend the rendering data with example and sprite-relative-path details

   @param {object} data Base rendering data
   @returns {object} Extended rendering data
   */
  _initData(data) {
  // Render the HTML example when configured
    if (this.config.example) {
      const folder = path.dirname(path.dirname(path.dirname(__dirname)));
      const file = path.join('tmpl', this.mode, 'sprite.vto');
      const renderConfig = {
        template: path.resolve(folder, file),
        dest: path.join(this.config.dest, `sprite.${this.key}.html`),
      };

      if (isObject(this.config.example)) {
        if ('template' in this.config.example) {
          renderConfig.template = path.resolve(process.cwd(), this.config.example.template);
        }

        if ('dest' in this.config.example) {
          renderConfig.dest = path.resolve(this.config.dest, this.config.example.dest);
        }
      } else if (this.config.example !== true) {
        throw new ArgumentError(`SVGSpriter: the "example" option of the «${this.key}» sprite must be true or an object`);
      }

      this.config.example = renderConfig;
      data.example = path.relative(path.dirname(renderConfig.dest), this.config.sprite).split(path.sep).join('/');

      // Inline flag and fragment prefix for <use href="…"> references
      const isInline = Boolean(this.config.inline);
      data.inline = isInline;
      data.useRef = isInline ? '#' : `${data.example}#`;
    }

    this._spriter.debug('Created «%s» sprite instance («%s» mode)', this.key, this.mode);

    return data;
  }

  /**
   Layout the sprite

   @param {Array} files Sprite files being populated
   @param {(error: Error|null) => void} cb Node-style completion callback
   @returns {void}
   */
  layout(files, cb) {
    cb(null);
  }

  /**
   Append a unit suffix to a coordinate unless it is zero

   @param {number} number Coordinate value
   @param {string} unit Unit suffix to apply
   @returns {string} Coordinate value with the unit suffix appended
   */
  _addUnit(number, unit) {
    return number + (number === 0 ? '' : unit);
  }

  /**
   Evaluate and return a declaration value

   @param {unknown} global Global declaration setting
   @param {string} local Local declaration value
   @returns {string} Evaluated declaration value
   */
  declaration(global, local) {
    return global === true
      ? local || ''
      : String(global || '').trim();
  }

  /**
   Append a content hash to the sprite filename for cache busting

   @param {SVGSprite} svg SVG sprite to hash
   @returns {string} Sprite path
   */
  _addCacheBusting(svg) {
    if (!this.config.bust) {
      return this.config.sprite;
    }

    const hash = crypto.createHash('md5')
      .update(svg.toString(), 'utf8')
      .digest('hex')
      .slice(0, 8);
    const extension = path.extname(this.config.sprite);
    const filename = `${path.basename(this.config.sprite, extension)}-${hash}${extension}`;
    const spriteFullPath = path.join(path.dirname(this.config.sprite), filename);

    this.data.sprite = path.relative(this._cssDest, spriteFullPath).split(path.sep).join('/');

    if (this.config.example) {
      this.data.example = path.relative(path.dirname(this.config.example.dest), spriteFullPath).split(path.sep).join('/');
    }

    return spriteFullPath;
  }

  /**
   Build the configured CSS resources

   @param {Array} files Sprite files being populated
   @param {(error: Error|null) => void} cb Node-style completion callback
   @returns {void}
   */
  _buildCSSResources(files, cb) {
    buildCSSResources.call(this, files, cb);
  }

  /**
   Build the HTML example file

   @param {Array} files Sprite files being populated
   @param {(error: Error|null, data: object) => void} cb Node-style completion callback
   @returns {void}
   */
  _buildHTMLExample(files, cb) {
    buildHTMLExample.call(this, files, cb);
  }
}

/**
 Module export
 */
export default SVGSpriteBase;
