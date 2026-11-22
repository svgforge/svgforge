import fs from 'node:fs';
import path from 'node:path';
import {load as defaultLoad} from 'js-yaml';
import {dependencyKeys, getDependency} from '../deps.js';
import {createLogger} from './utils/logger.js';
import {spriteTypes} from './mode/registry.js';
import {
  isFunction,
  isObject,
  isPlainObject,
  isString,
} from './utils/index.js';

/**
 List of default shape transformations

 @type {Array}
 */
const defaultShapeTransform = ['svgo'];

/**
 Default SVG configuration

 @type {object}
 */
const defaultSVGConfig = {
  /**
   Add a DOCTYPE declaration to SVG documents

   @type {boolean}
   */
  doctypeDeclaration: true,
  /**
   Add an XML declaration to SVG documents

   @type {boolean}
   */
  xmlDeclaration: true,
  /**
   Namespace IDs in SVG documents to avoid ID clashes

   @type {boolean}
   */
  namespaceIDs: true,
  /**
   Prefix the usual alphabetical Namespace IDs with a custom string

   @type {string}
   */
  namespaceIDPrefix: '',
  /**
   Namespace CSS class names in SVG documents to avoid CSS clashes

   @type {boolean}
   */
  namespaceClassnames: true,
  /**
   Add width and height attributes to the sprite SVG

   @type {boolean}
   */
  dimensionAttributes: true,
  /**
   Additional root attributes for the outermost <svg> element

   @type {object}
   */
  rootAttributes: {},
};

/**
 Determine whether a value looks like a Winston logger

 @param {unknown} logger Value to inspect
 @returns {boolean} True if the value is a Winston-compatible logger
 */
const isWinstonLogger = logger => (
  isObject(logger)
  && logger.level !== undefined
  && Array.isArray(logger.transports)
  && isFunction(logger.log)
);

export default class SVGSpriterConfig {
  /**
   SVGSpriter configuration

   @param {object} config Configuration
   */
  constructor(config = {}) {
    // Logging
    this.log = this.#setupLogger(config);

    this.log.debug('Started logging');
    this.dest = path.resolve(config.dest || '.');

    this.log.debug('Prepared general options');
    if ('shape' in config && config.shape && !isPlainObject(config.shape)) {
      throw new TypeError('SVGSpriter: "shape" option must be an object');
    }

    this.shape = 'shape' in config && config.shape ? {...config.shape} : {};

    // Parse meta data (if configured)
    this.shape.meta = this.#getMetaData();

    // Register a sorting callback for shape names
    if (!('sort' in this.shape) || !isFunction(this.shape.sort)) {
      this.shape.sort = (shape1, shape2) => shape1.id === shape2.id ? 0 : (shape1.id > shape2.id ? 1 : -1);
    }

    this.#prepareShape();
    this.log.debug('Prepared `shape` options');

    if ('svg' in config && config.svg && !isPlainObject(config.svg)) {
      throw new TypeError('SVGSpriter: "svg" option must be an object');
    }

    this.svg = this.#prepareSVG(config);
    this.log.debug('Prepared `svg` options');

    if ('mode' in config && config.mode && !isPlainObject(config.mode)) {
      throw new TypeError('SVGSpriter: "mode" option must be an object');
    }

    this.mode = this.filter(config.mode && isPlainObject(config.mode) ? config.mode : {});
    this.log.debug('Prepared `mode` options');

    this.variables = {...config.variables};
    this.log.debug('Prepared `variables` options');

    this.#warnUnknownKeys(config);
    this.log.verbose('Initialized spriter configuration');
  }

  /**
   Warn on unknown top-level configuration keys

   @param {object} config Configuration object
   @returns {void}
   @private
   */
  #warnUnknownKeys(config) {
    const knownKeys = new Set(['dest', 'log', 'shape', 'svg', 'variables', 'mode', 'json', 'dryRun', 'watch', 'ignore', 'filter', 'quiet']);
    for (const key of Object.keys(config || {})) {
      if (!knownKeys.has(key)) {
        this.log.warn('Ignoring unknown configuration key "%s"', key);
      }
    }
  }

  /**
   Set up logger

   @param {object} config Configuration object
   @returns {object} Logger
   */
  #setupLogger(config) {
    let log = '';

    if ('log' in config) {
      if (isWinstonLogger(config.log) || (isString(config.log) && ['info', 'verbose', 'debug'].includes(config.log))) {
        log = config.log;
      } else if (config.log) {
        log = 'info';
      }
    }

    if (isWinstonLogger(log)) {
      return log;
    }

    return createLogger({
      level: log || 'info',
      silent: log.length === 0,
    });
  }

  /**
   Creating meta data

   @returns {object} updated meta data
   @private
   */
  #getMetaData() {
    if (!('meta' in this.shape) || isPlainObject(this.shape.meta)) {
      return {};
    }

    const metaFile = isString(this.shape.meta) ? path.resolve(this.shape.meta) : null;
    let meta = metaFile;
    let stat = meta ? fs.lstatSync(meta) : null;

    if (!stat) {
      return {};
    }

    if (stat.isSymbolicLink()) {
      meta = fs.readlinkSync(meta);
      stat = fs.statSync(meta);
    }

    meta = stat.isFile() ? fs.readFileSync(meta, 'utf8') : null;
    meta = meta ? getDependency(dependencyKeys.yamlLoad, defaultLoad)(meta) : {};

    const result = {};

    for (const [m, value] of Object.entries(meta)) {
      if (!isPlainObject(value)) {
        continue;
      }

      const {title, description} = value;
      const file = path.join(path.dirname(m), path.basename(m, '.svg'));
      result[file] = {title, description};
    }

    this.log.debug('Processed meta data file "%s"', path.basename(metaFile));

    return result;
  }

  /**
   Prepare shape

   @private
   */
  #prepareShape() {
    for (const key of ['id', 'dimension', 'spacing', 'accessibility']) {
      const value = this.shape[key];
      if (value && Object.hasOwn(this.shape, key) && !isPlainObject(value)) {
        throw new TypeError(`SVGSpriter: "shape.${key}" option must be an object`);
      }
    }

    if ('dedupe' in this.shape && this.shape.dedupe !== undefined && typeof this.shape.dedupe !== 'boolean') {
      throw new TypeError('SVGSpriter: "shape.dedupe" option must be a boolean');
    }

    if ('accessibility' in this.shape && isPlainObject(this.shape.accessibility) && 'autoTitle' in this.shape.accessibility) {
      const {autoTitle} = this.shape.accessibility;
      if (autoTitle !== undefined && typeof autoTitle !== 'boolean') {
        throw new TypeError('SVGSpriter: "shape.accessibility.autoTitle" option must be a boolean');
      }
    }

    this.#validateDimension();

    // Intermediate SVG destination
    this.shape.dest = 'dest' in this.shape ? String(this.shape.dest).trim() : '';
    this.shape.dest = this.shape.dest.length > 0 ? path.resolve(this.dest, this.shape.dest) : null;

    // Expand spacing options to arrays
    this.shape.spacing = this.#setupSpacing();

    if ('box' in this.shape.spacing) {
      const {box} = this.shape.spacing;
      if (!['content', 'padding', 'icon'].includes(box)) {
        throw new TypeError(`SVGSpriter: "shape.spacing.box" must be "content", "padding", or "icon", got ${String(box)}`);
      }
    }

    this.shape.transform = this.#prepareShapeTransform();
  }

  /**
   Validate shape dimension configuration

   @returns {void}
   @private
   */
  #validateDimension() {
    if (!('dimension' in this.shape) || !isPlainObject(this.shape.dimension)) {
      return;
    }

    for (const key of ['maxWidth', 'maxHeight', 'precision']) {
      const value = this.shape.dimension[key];
      if (value !== undefined && typeof value !== 'number' && Object.hasOwn(this.shape.dimension, key)) {
        throw new TypeError(`SVGSpriter: "shape.dimension.${key}" option must be a number`);
      }
    }

    const {attributes} = this.shape.dimension;
    if (attributes !== undefined && typeof attributes !== 'boolean') {
      throw new TypeError('SVGSpriter: "shape.dimension.attributes" option must be a boolean');
    }
  }

  /**
   Set up spacing

   @returns {object} updated spacing
   @private
   */
  #setupSpacing() {
    this.shape.spacing = 'spacing' in this.shape ? (this.shape.spacing || {}) : {};

    for (const property of ['padding']) {
      let spacing;

      if (Array.isArray(this.shape.spacing[property])) {
        const values = this.shape.spacing[property].map(n => Math.max(0, n));
        spacing = {
          top: values[0],
          right: values[1] ?? values[0],
          bottom: values[2] ?? values[0],
          left: values[3] ?? values[1] ?? values[0],
        };
        this.shape.spacing[property] = spacing;
      } else {
        // Spacing may carry a unit suffix (e.g. '10px'), so keep `parseInt`.
        // eslint-disable-next-line unicorn/prefer-number-coercion
        spacing = Math.max(0, Number.parseInt(this.shape.spacing[property] || 0, 10));
        this.shape.spacing[property] = {
          top: spacing, right: spacing, bottom: spacing, left: spacing,
        };
      }
    }

    return this.shape.spacing;
  }

  /**
   Prepare shape transforms

   @returns {Array<Array>} array of transform configurations
   @private
   */
  #prepareShapeTransform() {
    let transforms = defaultShapeTransform;

    if ('transform' in this.shape && this.shape.transform !== undefined && this.shape.transform !== null) {
      if (Array.isArray(this.shape.transform)) {
        transforms = this.shape.transform;
      } else if (isString(this.shape.transform)) {
        transforms = [this.shape.transform];
      } else if (this.shape.transform) {
        throw new TypeError('SVGSpriter: "shape.transform" option must be an array or string');
      }
    }

    const result = [];

    for (const transform of transforms) {
      const normalized = isString(transform)
        ? {[transform]: true}
        : (isFunction(transform) ? {custom: transform} : transform);

      if (!isObject(normalized)) {
        continue;
      }

      const entry = Object.entries(normalized).find(([, value]) => value === true || isObject(value) || isFunction(value));

      if (!entry) {
        continue;
      }

      const [transformer, value] = entry;
      result.push([transformer, value === true ? {} : value]);
    }

    return result;
  }

  /**
   Prepare svg

   @param {object} config initial configuration
   @returns {object} SVG Object
   @private
   */
  #prepareSVG(config) {
    let svg = {...defaultSVGConfig};
    svg = 'svg' in config ? Object.assign(svg, config.svg || {}) : svg;
    svg.xmlDeclaration ||= false;
    svg.doctypeDeclaration ||= false;
    svg.dimensionAttributes ||= false;
    svg.rootAttributes ||= {};

    // Prepare post-processing transforms
    svg.transform = this.#prepareAndProcessTransforms(svg);
    return svg;
  }

  /**
   Prepare svg transforms

   @param {object} svg SVG configuration object
   @returns {Array<(svg: string) => string>} List of transform functions applied to the serialized SVG
   @private
   */
  #prepareAndProcessTransforms(svg) {
    if (!('transform' in svg)) {
      return [];
    }

    if (isFunction(svg.transform)) {
      return [svg.transform];
    }

    if (Array.isArray(svg.transform)) {
      return svg.transform.filter(transform => isFunction(transform));
    }

    throw new TypeError('Expected transform property to be a function or array');
  }

  /**
   Pick out the relevant mode options out of a configuration object

   @param {object} config Configuration object
   @returns {object} Mode relevant options
   */
  filter(config = {}) {
    const filtered = {};

    for (const [mode, value] of Object.entries(config)) {
      let configMode = null;

      if (isPlainObject(value)) {
        configMode = value;
      } else if (value === true) {
        configMode = {};
      }

      if (configMode === null) {
        this.log.warn('Ignoring invalid mode configuration for "%s"', mode);
        continue;
      }

      if (!spriteTypes.has(configMode.mode || mode)) {
        this.log.warn('Ignoring unknown mode "%s"', configMode.mode || mode);
        continue;
      }

      filtered[mode] = configMode;
      filtered[mode].mode = configMode.mode || mode;
    }

    return filtered;
  }
}
