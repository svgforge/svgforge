
/**
 * svg-sprite is a Node.js module for creating SVG sprites
 *
 * @see https://github.com/svg-sprite/svg-sprite
 * @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 * @copyright © 2018 Joschi Kuphal
 * @license MIT https://github.com/joeda1/svgforge/blob/main/LICENSE
 */

import {Buffer} from 'node:buffer';
import defaultFs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import async from 'async';
import merge from 'lodash.merge';
import mustacheModule from 'mustache';
import File from 'vinyl';
import {getDependency} from '../../deps.js';
import {isObject} from '../utils/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sprite base class
 */
class SVGSpriteBase {
  /**
   * CSS mode
   *
   * @type {string}
   */
  MODE_CSS = 'css';

  /**
   * Defs mode
   *
   * @type {string}
   */
  MODE_DEFS = 'defs';

  /**
   * Symbol mode
   *
   * @type {string}
   */
  MODE_SYMBOL = 'symbol';

  /**
   * Stack mode
   *
   * @type {string}
   */
  MODE_STACK = 'stack';

  /**
   * View mode
   *
   * @type {string}
   */
  MODE_VIEW = 'view';

  /**
   * Template folder
   *
   * @type {string}
   */
  tmpl = 'common';

  /**
   * SVGSpriteBase
   *
   * @param {SVGSpriter} spriter SVG spriter
   * @param {object} config Configuration
   * @param {object} data Base data
   * @param {string} key Mode key
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
      const file = path.join('tmpl', this.tmpl, `sprite.${extension}`);
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
          if (!new RegExp(String.raw`\.${extension}$`, 'i').test(renderConfig.dest)) {
            renderConfig.dest += `.${extension}`;
          }
        }
      } else if (value !== true) {
        delete this.config.render[extension];
        continue;
      }

      this.config.render[extension] = renderConfig;
    }

    this._cssDest = 'css' in this.config.render ? path.dirname(this.config.render.css.dest) : this.config.dest;
  } else {
    this._cssDest = this.config.dest;
  }

  // Cache busting
  this.config.bust = Boolean(this.config.bust);

  // Prepare the CSS prefix
  this.config.prefix = this.config.prefix.trim();
  if (!/%s/.test(this.config.prefix.replaceAll('%%', ''))) {
    this.config.prefix += '%s';
  }

  // Refine the base data
  this.data = merge(this.data, this._initData({
    padding: this._spriter.config.shape.spacing.padding,
    sprite: path.relative(this._cssDest, this.config.sprite).split(path.sep).join('/'),
  }));

  this._init();
  }

  /**
   * Extended data initialization
   *
   * @param {object} data Data
   * @returns {object} Extended data
   */
_initData(data) {
  // If the HTML example should be rendered
  if (this.config.example) {
    const folder = path.dirname(path.dirname(path.dirname(__dirname)));
    const file = path.join('tmpl', this.mode, 'sprite.html');
    let renderConfig = {
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
      renderConfig = false; // todo: fix bug with this branch on line 142 (boolean has no "dest" property)
    }

    this.config.example = renderConfig;
    data.example = path.relative(path.dirname(renderConfig.dest), this.config.sprite).split(path.sep).join('/');
  }

  this._spriter.debug('Created «%s» sprite instance («%s» mode)', this.key, this.mode);

  return data;
};

/**
 * Layout the sprite
 *
 * @param {Array} files Files
 * @param {Function} cb Callback
 * @returns {void}
 */
layout(files, cb) {
  cb(null);
};

/**
 * Build the configured CSS resources
 *
 * @param {Array} files Files
 * @param {Function} cb Callback
 * @returns {void}
 */
_buildCSSResources(files, cb) {
  const createResourceTask = (renderConfig, data, spriter, ext) => {
    return _cb => {
      const out = getDependency('mustache:render', mustacheModule.render)(getDependency('node:fs:readFileSync', defaultFs.readFileSync).call(defaultFs, renderConfig.template, 'utf8'), data);
      if (out.length) {
        files[ext] = new File({
          base: spriter.config.dest,
          path: renderConfig.dest,
          contents: Buffer.from(out),
        });
        spriter.verbose('Created «%s» stylesheet resource', ext);
      }

      _cb(null);
    };
  };

  const tasks = [];

  if (this.config.render) {
    for (const [extension, value] of Object.entries(this.config.render)) {
      tasks.push(createResourceTask(value, this.data, this._spriter, extension));
    }
  }

  async.parallelLimit(tasks, this._spriter._limit, cb);
};

/**
 * Build the HTML example (non-CSS modes)
 *
 * @param {Array} files Files
 * @param {Function} cb Callback
 * @returns {void}
 */
_buildHTMLExample(files, cb) {
  if (this.config.example) {
    const out = getDependency('mustache:render', mustacheModule.render)(getDependency('node:fs:readFileSync', defaultFs.readFileSync).call(defaultFs, this.config.example.template, 'utf8'), this.data);
    if (out.length) {
      files.example = new File({
        base: this._spriter.config.dest,
        path: this.config.example.dest,
        contents: Buffer.from(out),
      });
      this._spriter.verbose('Created «%s» HTML example file', this.key);
    }
  }

  cb(null, this.data);
};

/**
 * Return a coordinate (number) with 'px' appended if non-zero
 *
 * @param {number} number Coordinate (number)
 * @param {string} unit Unit
 * @returns {string} Coordinate (number) with unit appended
 */
_addUnit(number, unit) {
  return number + (number !== 0 ? unit : '');
};

/**
 * Evaluate and return a declaration value
 *
 * @param {any} global Global declaration setting
 * @param {string} local Local declaration value
 * @returns {string} Evaluated declaration value
 */
declaration(global, local) {
  if (global === true) {
    return local || '';
  }

  return String(global || '').trim();
};

/**
 * Add cache busting
 *
 * @param {SVGSprite} svg SVG sprite
 * @returns {string} Sprite path
 */
_addCacheBusting(svg) {
  if (!this.config.bust) {
    return this.config.sprite;
  }

  const hash = crypto.createHash('md5')
    .update(svg.toString(), 'utf8')
    .digest('hex')
    .substr(0, 8);
  const extension = path.extname(this.config.sprite);
  const filename = `${path.basename(this.config.sprite, extension)}-${hash}${extension}`;
  const spriteFullPath = path.join(path.dirname(this.config.sprite), filename);

  this.data.sprite = path.relative(this._cssDest, spriteFullPath).split(path.sep).join('/');

  if (this.config.example) {
    this.data.example = path.relative(path.dirname(this.config.example.dest), spriteFullPath).split(path.sep).join('/');
  }

  return spriteFullPath;
  }
}

/**
 * Module export
 */
export default SVGSpriteBase;
