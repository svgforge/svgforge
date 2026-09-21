/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import path from 'node:path';
import {format} from 'node:util';
import {XMLSerializer} from '@xmldom/xmldom';
import {isFunction, isString, deepMerge} from '../utils/index.js';
import * as initSvg from './init-svg.js';
import * as dimensions from './dimensions.js';
import * as namespace from './namespace.js';
import * as references from './references.js';

const DEFAULT_XML_DECLARATION = '<?xml version="1.0" encoding="utf-8"?>';

/**
 Default callback for shape ID generation

 @param {string} template Template string
 @returns {string} Shape ID
 */
const createIdGenerator = template => {
  /**
   ID generator

   @param {string} name Relative file path
   @returns {string} Shape ID
   */
  const generator = function (name) {
    const pathname = this.separator ? name.split(path.sep).join(this.separator) : name;
    return format(template || '%s', path.basename(pathname.replaceAll(/\s+/gu, () => this.whitespace), '.svg'));
  };

  return generator;
};

/**
 Default shape configuration

 @type {object}
 */
const defaultConfig = {
  /**
   Shape ID related options

   @type {object}
   */
  id: {
    /**
     ID part separator (used for directory-to-ID traversal)

     @type {string}
     */
    separator: '--',
    /**
     Pseudo selector separator

     @type {string}
     */
    pseudo: '~',
    /**
     Whitespace replacement string

     @type {string}
     */
    whitespace: '_',
    /**
      ID traversal callback

      @param {(name: string, file: File) => string} generator
      */
    generator: createIdGenerator('%s'),
  },
  /**
   Dimension related options

   @type {object}
   */
  dimension: {
    /**
     Max. shape width

     @type {number}
     */
    maxWidth: 2000,
    /**
     Max. shape height

     @type {number}
     */
    maxHeight: 2000,
    /**
     Coordinate decimal places

     @type {number}
     */
    precision: 2,
    /**
     Add dimension attributes

     @type {boolean}
     */
    attributes: false,
  },
  /**
   Spacing related options

   @type {number}
   */
  spacing: {
    /**
     Padding around the shape

     @type {number | Array}
     */
    padding: {
      top: 0, right: 0, bottom: 0, left: 0,
    },
    /**
     Box sizing strategy

     Might be 'content' (padding is added outside of the shape), 'padding' (shape plus padding will make for the given maximum size)
     or 'contain' (like 'padding', but size will be fixed instead of maximum)

     @type {string}
     */
    box: 'content',
  },
};

/**
 Represents a single SVG shape within a sprite, managing its DOM representation and metadata
 */
class SVGShape {
  /**
   Default SVG namespace

   @type {string}
   */
  DEFAULT_SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  /**
   Xlink namespace

   @type {string}
   */
  XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
  /**
   DOM document

   @type {Document}
   */
  dom = undefined;
  /**
   Shape width

   @type {number|boolean}
   */
  width = false;
  /**
   Shape height

   @type {number|boolean}
   */
  height = false;
  /**
   Shape viewBox

   @type {Array|boolean}
   */
  viewBox = false;
  /**
   Shape title element

   @type {Element|null}
   */
  title = null;
  /**
   Shape description element

   @type {Element|null}
   */
  description = null;

  /**
   Initialize a new SVG shape from a source file

   @param {File} file Source vinyl file containing SVG content
   @param {SVGSpriter} spriter Parent spriter instance
   */
  constructor(file, spriter) {
    this.source = file;
    this.spriter = spriter;
    this.svg = {current: this.source.contents.toString(), ready: null};
    this.name = path.relative(this.source.base, this.source.path);
    // Known limitation: an empty shape config object is set when `spriter.config.shape` is absent.
    // https://github.com/svg-sprite/svg-sprite/pull/653#discussion_r841069781
    this.config = deepMerge({}, defaultConfig, this.spriter.config.shape || {});

    if (!isFunction(this.config.id.generator)) {
      this.config.id.generator = createIdGenerator(isString(this.config.id.generator) ? this.config.id.generator + (this.config.id.generator.includes('%s') ? '' : '%s') : '%s');
    }

    this.id = this.config.id.generator(this.name, this.source);
    this.state = this.id.split(this.config.id.pseudo);
    this.base = this.state.shift();
    this.state = this.state.shift() || null;
    this._precision = 10 ** Number(this.config.dimension.precision);
    this._scale = 1;
    this._namespaced = false;

    // Determine meta data
    const relative = path.basename(this.source.relative, '.svg');
    this.meta = Object.hasOwn(this.config.meta, this.id) ? this.config.meta[this.id] : (Object.hasOwn(this.config.meta, relative) ? this.config.meta[relative] : {});

    // Initially set the SVG of this shape
    this._initSVG();

    // XML declaration and doctype
    const xmldecl = this.svg.current.match(/<\?xml.*?>/gu);
    const doctype = this.svg.current.match(/<!DOCTYPE.*?>/gu);
    this.xmlDeclaration = xmldecl ? xmldecl[0] : DEFAULT_XML_DECLARATION;
    this.doctypeDeclaration = doctype ? doctype[0] : '';

    this.spriter.verbose('Added shape "%s:%s"', this.base, this.state || 'regular');
  }

  /**
   Return a string representation of the shape

   @returns {string} String representation
   */
  toString() {
    return '[object SVGShape]';
  }

  /**
   Recursively strip unneeded namespace declarations

   @param {HTMLElement} element The DOM element to strip namespaces from
   @param {object} [nsMap] Namespace URI mapping keyed by prefix
   @returns {HTMLElement} Element
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _stripInlineNamespaceDeclarations(element, nsMap) {
    const parentNsMap = {...element._nsMap};
    nsMap ||= {'': this.DEFAULT_SVG_NAMESPACE};

    // Strip the default SVG namespace
    if (nsMap[''] === this.DEFAULT_SVG_NAMESPACE) {
      const defaultNamespace = element.attributes.getNamedItem('xmlns');
      if (defaultNamespace && defaultNamespace.value === this.DEFAULT_SVG_NAMESPACE) {
        element.attributes.removeNamedItem('xmlns');
      }
    }

    if (!('xlink' in nsMap) || nsMap.xlink === this.XLINK_NAMESPACE) {
      const xlinkNamespace = element.attributes.getNamedItem('xmlns:xlink');
      if (xlinkNamespace && xlinkNamespace.value === this.XLINK_NAMESPACE) {
        element.attributes.removeNamedItem('xmlns:xlink');
      }
    }

    for (let index = 0; index < element.childNodes.length; index++) {
      const child = element.childNodes.item(index);
      if (child.nodeType === 1) {
        this._stripInlineNamespaceDeclarations(child, parentNsMap);
      }
    }

    return element;
  }

  /**
   Return the SVG of this shape

   @param {boolean} inline Prepare for inline usage (strip redundant XML namespaces)
   @param {(svg: HTMLElement) => void} [transform] Optional final transformer before serialization (operating on a clone)
   @returns {string} Serialized SVG markup
  */
  getSVG(inline, transform) {
    let svg = this.dom.documentElement.cloneNode(true);

    // Call the final transformer (if available)
    if (isFunction(transform)) {
      transform(svg);
    }

    // If the SVG is to be used inline or as part of a sprite: Strip redundant namespace declarations
    if (inline) {
      return new XMLSerializer().serializeToString(this._stripInlineNamespaceDeclarations(svg));
    }

    // Else: Add XML and DOCTYPE declarations if required
    svg = new XMLSerializer().serializeToString(svg);

    // Add DOCTYPE declaration
    if (this.spriter.config.svg.doctypeDeclaration) {
      svg = this.doctypeDeclaration + svg;
    }

    // Add XML declaration
    if (this.spriter.config.svg.xmlDeclaration) {
      svg = this.xmlDeclaration + svg;
    }

    return svg;
  }

  /**
   Set the SVG of this shape

   @param {string} svg Raw SVG markup string to set
   @returns {SVGShape} Self reference
  */
  setSVG(svg) {
    this.svg.current = svg;
    this.svg.ready = null;
    return this._initSVG();
  }

  /**
   Initialize the SVG of this shape

   @returns {SVGShape} Self reference
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _initSVG() {
    return initSvg._initSVG.call(this);
  }

  /**
   Return the dimensions of this shape

   @returns {object} Width and height of the shape
   */
  getDimensions() {
    return dimensions.getDimensions.call(this);
  }

  /**
   Set the dimensions of this shape

   @param {number} width New width value
   @param {number} height New height value
   @returns {SVGShape} Self reference
   */
  setDimensions(width, height) {
    return dimensions.setDimensions.call(this, width, height);
  }

  /**
   Return the shape's viewBox (and set it if it doesn't exist yet)

   @param {number} width Optional width override
   @param {number} height Optional height override
   @returns {Array} Four-element viewBox array
   */
  getViewbox(width, height) {
    return dimensions.getViewbox.call(this, width, height);
  }

  /**
   Set the shape's viewBox

   @param {number} x X coordinate
   @param {number} y Y coordinate
   @param {number} width New shape width
   @param {number} height New shape height
   @returns {Array} Updated viewBox array
   */
  setViewbox(x, y, width, height) {
    return dimensions.setViewbox.call(this, x, y, width, height);
  }

  /**
   Complement the SVG shape by adding dimensions, padding and meta data

   @param {(error: Error|null, shape: SVGShape) => void} cb Completion callback
   */
  complement(cb) {
    dimensions.complement.call(this, cb);
  }

  /**
   Complement the shape's dimensions

   @param {(error: Error|null) => void} cb Completion callback
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _complementDimensions(cb) {
    dimensions._complementDimensions.call(this, cb);
  }

  /**
   Determine the shape's dimension by rendering it

   @param {(error: Error|null) => void} cb Completion callback
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _determineDimensions(cb) {
    dimensions._determineDimensions.call(this, cb);
  }

  /**
   Round a number considering the given decimal place precision

   @param {number} n Number
   @returns {number} Rounded number
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _round(n) {
    return dimensions._round.call(this, n);
  }

  /**
   Scale the shape if necessary

   @param {(error: Error|null) => void} cb Completion callback
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _setDimensions(cb) {
    dimensions._setDimensions.call(this, cb);
  }

  /**
   Add padding to this shape

   @param {(error: Error|null) => void} cb Completion callback
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _addPadding(cb) {
    dimensions._addPadding.call(this, cb);
  }

  /**
   Add metadata to this shape

   @param {(error: Error|null) => void} cb Completion callback
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _addMetadata(cb) {
    dimensions._addMetadata.call(this, cb);
  }

  /**
   Apply a namespace prefix to all IDs within the SVG document

   @param {string} ns ID namespace
   */
  setNamespace(ns) {
    namespace.setNamespace.call(this, ns);
  }

  /**
   Reset the shapes namespace
   */
  resetNamespace() {
    namespace.resetNamespace.call(this);
  }

  /**
   Replace ID and class references

   @param {string} string_ String to substitute references in
   @param {object} substIds ID substitutions
   @param {object} substClassnames Class name substitutions
   @param {boolean} selectors Substitute CSS selectors
   @returns {string} String with replaced ID and class name references
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _replaceIdAndClassnameReferences(string_, substIds, substClassnames, selectors) {
    return references._replaceIdAndClassnameReferences.call(this, string_, substIds, substClassnames, selectors);
  }

  /**
   Recursively replace ID and class references in CSS selectors

   @param {string} string_ Original CSS text
   @param {Array} rules Parsed CSS rule objects
   @param {object} substIds ID substitutions
   @param {object} substClassnames Class name substitutions
   @returns {string} Substituted CSS text
   */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _replaceIdAndClassnameReferencesInCssSelectors(string_, rules, substIds, substClassnames) {
    return references._replaceIdAndClassnameReferencesInCssSelectors.call(this, string_, rules, substIds, substClassnames);
  }
}

/**
 Module factory creating an SVGShape instance

 @param {File} file Vinyl file
 @param {SVGSpriter} spriter Spriter instance
 @returns {SVGShape} SVGShape instance
 */
export default function createShape(file, spriter) {
  return new SVGShape(file, spriter);
}
