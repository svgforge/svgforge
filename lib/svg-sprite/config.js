import fs from 'node:fs';
import path from 'node:path';
import {load as defaultLoad} from 'js-yaml';
import winston from 'winston';
import {getDependency} from '../deps.js';
import {
  isFunction,
  isObject,
  isPlainObject,
  isString,
} from './utils/index.js';

/**
 Recognized sprite mode identifiers

 @type {Set<string>}
 */
const spriteTypes = new Set(['css', 'view', 'defs', 'symbol', 'stack']);

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
  /**
   Floating point precision for CSS positioning values

   @type {number}
   */
  precision: -1,
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
    this.shape = 'shape' in config ? {...config.shape} : {};

    // Parse meta data (if configured)
    this.shape.meta = this.#getMetaData();

    // Parse alignment data (if configured)
    this.shape.align = this.#getAlignmentData();

    // Register a sorting callback for shape names
    if (!('sort' in this.shape) || !isFunction(this.shape.sort)) {
      this.shape.sort = (shape1, shape2) => shape1.id === shape2.id ? 0 : (shape1.id > shape2.id ? 1 : -1);
    }

    this.#prepareShape();
    this.log.debug('Prepared `shape` options');

    this.svg = this.#prepareSVG(config);
    this.log.debug('Prepared `svg` options');

    this.mode = this.filter(config.mode);
    this.log.debug('Prepared `mode` options');

    this.variables = {...config.variables};
    this.log.debug('Prepared `variables` options');
    this.log.verbose('Initialized spriter configuration');
  }

  /**
   Set up logger

   @param {object} config Configuration object
   @returns {object} Winston logger
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

    return winston.createLogger({
      transports: [new winston.transports.Console({
        level: log || 'info',
        silent: log.length === 0,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:MM:ss.SSS',
          }),
          winston.format.splat(),
          winston.format.printf(info => `${info.timestamp} - ${info.level}: ${info.message}`),
        ),
      })],
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
    meta = meta ? getDependency('js-yaml:load', defaultLoad)(meta) : {};

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
   Create alignment data

   @returns {object} updated align data
   @private
   */
  #getAlignmentData() {
    const alignmentData = {'*': {'%s': 0}};

    if (!('align' in this.shape) || isPlainObject(this.shape.align)) {
      return alignmentData;
    }

    const alignFile = isString(this.shape.align) ? path.resolve(this.shape.align) : null;
    let align = alignFile;
    let stat = align ? fs.lstatSync(align) : null;

    if (!stat) {
      return alignmentData;
    }

    if (stat.isSymbolicLink()) {
      align = fs.readlinkSync(align);
      stat = fs.statSync(align);
    }

    align = stat.isFile() ? fs.readFileSync(align, 'utf8') : null;
    align = align ? getDependency('js-yaml:load', defaultLoad)(align) : {};

    for (const [key, value] of Object.entries(align)) {
      if (!isPlainObject(value) || Object.keys(value).length === 0) {
        continue;
      }

      alignmentData[key] ||= {};
      for (const [tmpl, tmplValue] of Object.entries(value)) {
        const template = tmpl.length > 0 ? (tmpl.includes('%s') ? tmpl : `%s${tmpl}`) : '%s';
        const file = path.join(path.dirname(key), path.basename(key, '.svg'));
        // Template value may carry a unit suffix (e.g. '50%'), so keep `parseFloat`.
        // eslint-disable-next-line unicorn/prefer-number-coercion
        alignmentData[file][template] = Math.max(0, Math.min(1, Number.parseFloat(tmplValue)));
      }
    }

    this.log.debug('Processed alignment data file "%s"', path.basename(alignFile));

    return alignmentData;
  }

  /**
   Prepare shape

   @private
   */
  #prepareShape() {
    // Intermediate SVG destination
    this.shape.dest = 'dest' in this.shape ? String(this.shape.dest).trim() : '';
    this.shape.dest = this.shape.dest.length > 0 ? path.resolve(this.dest, this.shape.dest) : null;

    // Expand spacing options to arrays
    this.shape.spacing = this.#setupSpacing();

    this.shape.transform = this.#prepareShapeTransform();
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
    const transforms = 'transform' in this.shape && Array.isArray(this.shape.transform)
      ? this.shape.transform
      : defaultShapeTransform;

    const result = [];

    for (const transform of transforms) {
      const normalized = isString(transform)
        ? {[transform]: true}
        : (isFunction(transform) ? {custom: transform} : transform);

      if (!isObject(normalized)) {
        continue;
      }

      const entry = Object.entries(normalized).find(([, value]) => value === true || isObject(value) || isFunction(value));

      if (entry) {
        const [transformer, value] = entry;
        result.push([transformer, value === true ? {} : value]);
      }
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
    // Precision may carry a unit suffix, so keep `parseInt`.
    // eslint-disable-next-line unicorn/prefer-number-coercion
    svg.precision = Math.max(-1, Number.parseInt(svg.precision || -1, 10));

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

      if (configMode !== null && spriteTypes.has(configMode.mode || mode)) {
        filtered[mode] = configMode;
        filtered[mode].mode = configMode.mode || mode;
      }
    }

    return filtered;
  }
}
