/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import path from 'node:path';
import events from 'node:events';
import {format} from 'node:util';
import SpriteFile from './file.js';
import Config from './config.js';
import Queue from './queue.js';
import Layouter from './layouter.js';
import svgo from './transform/svgo.js';
import ArgumentError from './errors/argument-error.js';
import {
  isFunction,
  isObject,
  isPlainObject,
  zipObject,
  deepMerge,
  runParallelLimit,
} from './utils/index.js';
import prettySize from './utils/pretty-size.js';
import {shapeConcurrency} from './utils/parallelism.js';

/**
 Creates an SVG sprite and manages its shapes, layouts and compilation

 @param {object} config Configuration
 */
export default class SVGSpriter extends events.EventEmitter {
  /**
   Create a new spriter instance

   @param {object} config Configuration
   */
  constructor(config) {
    super();

    this.config = new Config(config);
    this._queue = new Queue(this);
    this._shapes = [];
    this._namespacePow = [];
    this._shapeTransformers = {svgo};
    this._compileQueue = [];
    this._shapesDest = [];
    this._limit = shapeConcurrency();
    this._totalShapes = 0;
    this._processedShapes = 0;
    this._dimensionSkipped = 0;
    this._errorSkipped = 0;
    this._dedupeHashes = new Set();

    this.info('Processing up to %d shapes concurrently', this._limit);

    this._queue.on('remove', () => this.#emitProgress());
    this._queue.on('empty', () => this.#emitProgress());
    this._queue.on('shape-skipped', payload => this.emit('shape-skipped', payload));

    this._queue.on('empty', this._compile.bind(this));
    this._queue.on('empty', this._getShapes.bind(this));
    this.on('compiled', this._compile.bind(this));
    this.info('Created spriter instance');
  }

  /**
   Emit a progress event for each shape that finished processing
   */
  #emitProgress() {
    ++this._processedShapes;
    this.emit('progress', {
      processed: this._processedShapes,
      total: this._totalShapes,
    });
  }

  /**
   Maximum number of shapes processed concurrently
   @returns {number} Concurrent shape limit
   */
  get limit() {
    return this._limit;
  }

  /**
   Number of shapes skipped because dimensions could not be determined
   @returns {number} Count of dimension-skipped shapes
   */
  get dimensionSkipped() {
    return this._dimensionSkipped;
  }

  /**
   Number of shapes skipped because of processing errors
   @returns {number} Count of error-skipped shapes
   */
  get errorSkipped() {
    return this._errorSkipped;
  }

  /**
   Add an SVG shape to the sprites

   @param {object | string} [file] File object or absolute file path
   @param {string} [name] Name part of the file path
   @param {Buffer | string} [svg] SVG content
   @returns {SVGSpriter} Self reference
   @throws {Error} In case an invalid file is added
  */
  add(file = '', name = '', svg = '') {
    let fileObject;

    if (this._isFileLike(file)) {
      fileObject = file;
      fileObject.base = path.resolve(fileObject.base);
      fileObject.path = path.resolve(fileObject.path);
    } else if (isObject(file) && typeof file.base === 'string' && typeof file.path === 'string') {
      this._throwArgumentError('SVGSpriter.add: File contents must be a Buffer');
    } else {
      fileObject = this._createFileFromPath(file, name, svg, arguments.length);
    }

    if (this.config.shape?.dedupe) {
      const hash = createHash('sha1').update(fileObject.contents).digest('hex');
      if (this._dedupeHashes.has(hash)) {
        this.verbose('Skipping duplicate shape "%s"', path.basename(fileObject.path));
        return this;
      }

      this._dedupeHashes.add(hash);
    }

    // Add the shape to the internal processing queue
    ++this._totalShapes;
    this._queue.add(fileObject);

    return this;
  }

  /**
   Create a file object from path, name and SVG contents

   @param {string} file Absolute file path
   @param {string} name Name part of the file path
   @param {Buffer | string} svg SVG content
   @param {number} argumentCount Number of arguments passed to add
   @returns {SpriteFile} File object
   @throws {ArgumentError} In case of invalid arguments
  */
  _createFileFromPath(file, name, svg, argumentCount) {
    file = String(file).trim();
    file &&= path.normalize(file);

    let errorMessage = null;

    // If the name part of the file path is absolute
    if (name && path.isAbsolute(name)) {
      errorMessage = format('SVGSpriter.add: "%s" is not a valid relative file name', name);
    } else {
      name &&= name.trim();
      name &&= path.normalize(name);

      name ||= path.basename(file);
      // Performance note: SVG is converted Buffer -> String -> Buffer here; a future optimization could keep it in one form.
      if (Buffer.isBuffer(svg)) {
        svg = svg.toString();
      }

      svg = String(svg).trim();

      // Argument validation
      if (argumentCount < 3) {
        errorMessage = 'SVGSpriter.add: You must provide 3 arguments';
      } else if (file.length === 0) {
        errorMessage = format('SVGSpriter.add: "%s" is not a valid absolute file name', file);
      } else if (name.length === 0) {
        errorMessage = format('SVGSpriter.add: "%s" is not a valid relative file name', name);
      } else if (svg.length === 0) {
        errorMessage = 'SVGSpriter.add: You must provide SVG contents';
      } else if (!file.endsWith(name)) {
        errorMessage = format('SVGSpriter.add: "%s" is not the local part of "%s"', name, file);
      }
    }

    if (errorMessage) {
      this._throwArgumentError(errorMessage);
    }

    // Resolve path before splitting it into base and path
    // so that Shape will properly extract a shape name later on.
    file = path.resolve(file);

    // Instantiate a file object
    const baseLength = Math.max(0, file.length - name.length);
    return new SpriteFile({
      base: path.resolve(file.slice(0, baseLength)),
      path: file,
      contents: Buffer.from(svg),
    });
  }

  /**
   Log and throw an argument error

   @param {string} errorMessage Message for the thrown ArgumentError
   @throws {ArgumentError}
  */
  _throwArgumentError(errorMessage) {
    const error = new ArgumentError(errorMessage);
    this.error(errorMessage, error);
    throw error;
  }

  /**
   Check whether a parameter is a file-like object with Buffer contents

   @param {unknown} file Arbitrary handled parameter
   @returns {boolean} Parameter is a file-like object
  */
  _isFileLike(file) {
    return isObject(file) && typeof file.base === 'string' && typeof file.path === 'string' && Buffer.isBuffer(file.contents);
  }

  /**
   Transform a single shape

   @param {SVGShape} shape Shape to be transformed
   @returns {Promise<void>}
  */
  async _transformShape(shape) {
    // Run through all configured transforms
    for (const transform of this.config.shape.transform) {
      // If it's a custom transformer
      if (isFunction(transform[1])) {
        const transformFn = transform[1];
        if (transformFn.length >= 3) {
          // eslint-disable-next-line no-await-in-loop -- Transforms must run sequentially.
          await new Promise((resolve, reject) => {
            transformFn(shape, this, error => (error ? reject(error) : resolve()));
          });
        } else {
          // eslint-disable-next-line no-await-in-loop -- Transforms must run sequentially.
          await transformFn(shape, this);
        }

      // Else if it's a registered transformer
      } else if (Object.hasOwn(this._shapeTransformers, transform[0]) && isObject(transform[1])) {
        // eslint-disable-next-line no-await-in-loop -- Transforms must run sequentially.
        await this._shapeTransformers[transform[0]](shape, transform[1], this);
      }
    }
  }

  /**
   Compile the sprite & additional resources

   @param {object} [config] Configuration
   @returns {Promise<{result: object, data: object}>} Compile result
  */
  compile(config) {
    if (isFunction(config)) {
      throw new ArgumentError('SVGSpriter.compile: callback arguments are no longer supported; use the returned Promise');
    }

    const _config = isPlainObject(config)

      // eslint-disable-next-line unicorn/no-array-callback-reference -- Config#filter is a mode-option accessor, not Array#filter.
      ? this.config.filter(config)
      : deepMerge({}, this.config.mode);

    return new Promise((resolve, reject) => {
      this._compileQueue.push([
        _config,
        (error, result, data) => {
          if (error) {
            reject(error);
          } else {
            resolve({result, data});
          }
        },
      ]);
      // eslint-disable-next-line no-void -- fire-and-forget
      void this._compile();
    });
  }

  /**
   Run the next compile task

   @returns {Promise<void>} Resolves when the compile task completes
  */
  async _compile() {
  // If the shape queue is currently active return early
    if (this._queue.active || this._compileQueue.length === 0) {
      return;
    }

    const [config, cb] = this._compileQueue.shift();

    try {
      let result;
      let data;

      // If this is a modeless run
      if (Object.keys(config).length === 0) {
        const files = {};

        // Add intermediate SVG files
        if (this.config.shape.dest) {
          files.shapes = this._getShapeFiles(this.config.shape.dest);
          this.verbose('Returning %d intermediate SVG files', files.shapes.length);
        }

        this._logStats(files);
        result = files;
        data = {};
      } else {
        this.info('Compiling %d shapes...', this._shapes.length);

        // Initialize the namespace powers
        while (this._namespacePow.length === 0 || (26 ** this._namespacePow.length < this._shapes.length)) {
          this._namespacePow.unshift(26 ** this._namespacePow.length);

          for (const shape of this._shapes) {
            shape.resetNamespace();
          }
        }

        // Sort shapes by ID
        this._shapes = this._shapes.toSorted(this.config.shape.sort);

        // Set the shape namespaces on all shapes
        for (const [index, shape] of this._shapes.entries()) {
          shape.setNamespace(this._indexNamespace(index));
        }

        ({result, data} = await this._layout(config));

        // Add intermediate SVG files
        if (this.config.shape.dest) {
          result.shapes = this._getShapeFiles(this.config.shape.dest);
          this.verbose('Returning %d intermediate SVG files', result.shapes.length);
        }

        this.info('Finished %s sprite compilation', Object.keys(data).map(mode => `«${mode}»`).join(' + '));

        this._logStats(result);
      }

      cb(null, result, data);
      this.emit('compiled');
    } catch (error) {
      cb(error);
    }

    if (this._compileQueue.length > 0 && !this._queue.active) {
      // eslint-disable-next-line no-void -- fire-and-forget
      void this._compile();
    }
  }

  /**
   Return a unique namespace prefix for a shape index

   @param {number} index Shape index
   @returns {string} Namespace prefix
  */
  _indexNamespace(index) {
    let namespace = '';

    for (const namespacePow of this._namespacePow) {
      const charCode = Math.floor(index / namespacePow);
      namespace += String.fromCodePoint(97 + charCode);
      index -= charCode * namespacePow;
    }

    return namespace;
  }

  /**
   Layout the sprites

   @param {object} config Layout configuration
   @returns {Promise<{result: object, data: object}>} Layout result and data
  */
  async _layout(config) {
    const files = {};
    const layout = new Layouter(this, config);

    const tasks = Object.entries(config).map(([mode, value]) => async () => layout.layout(files, mode, value.mode));

    const data = await runParallelLimit(tasks, this._limit);
    return {
      result: files,
      data: zipObject(Object.values(data).map(value => value.key), data),
    };
  }

  /**
   Return all current shapes

   @param {string} [dest] Destination directory
   @returns {Promise<Array>} Shape file objects
  */
  getShapes(dest) {
    if (isFunction(dest)) {
      throw new ArgumentError('SVGSpriter.getShapes: callback arguments are no longer supported; use the returned Promise');
    }

    return new Promise((resolve, reject) => {
      this._shapesDest.push([dest || '', (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }]);
      this._getShapes();
    });
  }

  /**
   Return all current shapes
  */
  _getShapes() {
  // If the shape queue is not currently active
    if (!this._queue.active) {
      while (this._shapesDest.length > 0) {
        const [dest, cb] = this._shapesDest.shift();
        cb(null, this._getShapeFiles(dest));
      }
    }
  }

  /**
   Return the shapes as a list of file objects

   @param {string} dest Destination directory
   @returns {Array} Shape file list
  */
  _getShapeFiles(dest) {
    return this._shapes.map(shape => new SpriteFile({
      base: this.config.dest,
      path: path.join(dest, `${shape.id}.svg`),
      contents: Buffer.from(shape.getSVG(false)),
    }));
  }

  /**
   Log file statistics

   @param {object} files Mode-keyed resource groups to tally
  */
  _logStats(files) {
    const sizes = {};
    const extensions = {};

    for (const mode of Object.values(files)) {
      for (const resource of Object.values(mode)) {
        const file = resource.relative;
        const ext = path.extname(resource.path).toUpperCase();
        extensions[ext] = (extensions[ext] || 0) + 1;
        sizes[file] = prettySize(resource.contents.length);
      }
    }

    this.info('Created %s', Object.entries(extensions).map(ext => `${ext[1]} x ${ext[0].slice(1)}`).join(', '));

    const sortedSizes = Object.entries(sizes).toSorted(([a], [b]) => String(a) > String(b) ? 1 : -1);

    for (const [file, size] of sortedSizes) {
      this.verbose('Created %s: %s', file, size);
    }
  }

  /**
   Pass info messages on to the logger

   @param {...unknown} args arguments
  */
  info(...args) {
    this.config.log.info(...args);
  }

  /**
   Pass verbose messages on to the logger

   @param {...unknown} args arguments
  */
  verbose(...args) {
    this.config.log.verbose(...args);
  }

  /**
   Pass debug messages on to the logger

   @param {...unknown} args arguments
  */
  debug(...args) {
    this.config.log.debug(...args);
  }

  /**
   Pass warning messages on to the logger

   @param {...unknown} args arguments
  */
  warn(...args) {
    this.config.log.warn(...args);
  }

  /**
   Pass error messages on to the logger

   @param {...unknown} args arguments
  */
  error(...args) {
    this.config.log.error(...args);
  }
}
