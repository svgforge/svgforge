import path from 'node:path';
import {format} from 'node:util';
import {createRequire} from 'node:module';
import {DOMParser, XMLSerializer} from '@xmldom/xmldom';
import xpath from 'xpath';
import cssom from 'cssom';
import {createParser} from 'css-selector-parser';
import {getDependency} from '../deps.js';
import fixXMLString from './utils/fix-xml-string.js';
import calculateSvgDimensions from './utils/calculate-svg-dimensions.js';
import {
  isFunction,
  isString,
  deepMerge,
  runWaterfall,
} from './utils/index.js';
import ArgumentError from './errors/argument-error.js';
import NotPermittedError from './errors/not-permitted-error.js';

const require = createRequire(import.meta.url);

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
const svgReferenceProperties = ['style', 'fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-end', 'marker-mid'];

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
    this.name = this.source.path.slice(this.source.base.length + path.sep.length);
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
  // Basic check for basic SVG file structure
    const validSVGRegExp = /<svg(?:\s+[\d\-:a-z]+=(?<quote>["']).*?\k<quote>)*\s*(?:(?<slash>\/)|(?<content>>[\s\S]*<\/svg))>/iu;
    let svgStart = this.svg.current.match(validSVGRegExp);

    if (!svgStart) {
      const throwError = () => {
        throw new ArgumentError('Invalid SVG file');
      };

      try {
        const fixedXMLString = getDependency('fixXMLString', fixXMLString)(this.svg.current);
        svgStart = fixedXMLString.match(validSVGRegExp);

        if (!svgStart) {
          return throwError();
        }

        this.svg.current = fixedXMLString;
      } catch {
        throwError();
      }
    }

    // Resolve XML entities
    const entityRegExp = /<!ENTITY\s+(?<entityName>\S+)\s+(?<entityQuote>["'])(?<entityValue>.+)\k<entityQuote>>/u;
    const entityMap = {};
    let entityStart = 0;
    let entities = 0;
    let entity;

    do {
      entity = entityRegExp.exec(this.svg.current.slice(entityStart));
      if (entity) {
        ++entities;
        entityStart += entity.index + entity[0].length;
        entityMap[entity.groups.entityName] = entity.groups.entityValue;
      }
    } while (entity);

    if (entities) {
      let svg = this.svg.current.slice(svgStart.index);
      for (const [key, value] of Object.entries(entityMap)) {
        svg = svg.replace(`&${key};`, () => value);
      }

      this.svg.current = this.svg.current.slice(0, Math.max(0, svgStart.index)) + svg;
    }

    // Strip DOCTYPE+ENTITY declarations before parsing (entities already inlined)
    let svgToParse = this.svg.current;
    const doctypeMatch = svgToParse.match(/<!DOCTYPE\s+(?:<!ENTITY[^>]*>\s*)*>/u);
    if (doctypeMatch) {
      svgToParse = svgToParse.slice(0, doctypeMatch.index) + svgToParse.slice(doctypeMatch.index + doctypeMatch[0].length);
    }

    // Parse the XML
    this.dom = new DOMParser({
      onError(level, message) {
        throw new ArgumentError(format('Invalid SVG file (%s)', message.replaceAll('\n', ' ')));
      },
    }).parseFromString(svgToParse, 'image/svg+xml');

    // Determine the shape width
    const width = this.dom.documentElement.getAttribute('width');
    // SVG width may carry a unit suffix (e.g. '48px'), so keep `parseFloat`.
    // eslint-disable-next-line unicorn/prefer-number-coercion
    this.width = width ? Number.parseFloat(width) : false;

    // Determine the shape height
    const height = this.dom.documentElement.getAttribute('height');
    // eslint-disable-next-line unicorn/prefer-number-coercion
    this.height = height ? Number.parseFloat(height) : false;

    // Determine the viewbox
    let viewBox = this.dom.documentElement.getAttribute('viewBox');
    if (viewBox?.length) {
      viewBox = viewBox.split(/[^\d\-.]+/u);
      while (viewBox.length < 4) {
        viewBox.push(0);
      }

      for (const [index, value] of viewBox.entries()) {
        // eslint-disable-next-line unicorn/prefer-number-coercion
        viewBox[index] = Number.parseFloat(value);
      }

      this.viewBox = viewBox;
    } else {
      this.viewBox = false;
    }

    this.title = null;
    this.description = null;

    const children = this.dom.documentElement.childNodes;
    const meta = {title: 'title', description: 'desc'};

    for (let child = 0; child < children.length; child++) {
      for (const [m, value] of Object.entries(meta)) {
        if (value === children.item(child).localName) {
          this[m] = children.item(child);
        }
      }
    }

    return this;
  }

  /**
   Return the dimensions of this shape

   @returns {object} Width and height of the shape
  */
  getDimensions() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  /**
   Set the dimensions of this shape

   @param {number} width New width value
   @param {number} height New height value
   @returns {SVGShape} Self reference
  */
  setDimensions(width, height) {
    // Width/height may carry a unit suffix (e.g. '48px'), so keep `parseFloat`.
    // eslint-disable-next-line unicorn/prefer-number-coercion
    this.width = this._round(Math.max(0, Number.parseFloat(width)));
    this.dom.documentElement.setAttribute('width', this.width);
    // eslint-disable-next-line unicorn/prefer-number-coercion
    this.height = this._round(Math.max(0, Number.parseFloat(height)));
    this.dom.documentElement.setAttribute('height', this.height);
    return this;
  }

  /**
   Return the shape's viewBox (and set it if it doesn't exist yet)

   @param {number} width Optional width override
   @param {number} height Optional height override
   @returns {Array} Four-element viewBox array
  */
  getViewbox(width, height) {
    if (!this.viewBox) {
      this.setViewbox(0, 0, width || this.width, height || this.height);
    }

    return this.viewBox;
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
    if (Array.isArray(x)) {
      // eslint-disable-next-line unicorn/prefer-number-coercion
      this.viewBox = x.map(n => Number.parseFloat(n));
      while (this.viewBox.length < 4) {
        this.viewBox.push(0);
      }
    } else {
      // eslint-disable-next-line unicorn/prefer-number-coercion -- ViewBox components use `parseFloat` semantics (empty strings yield NaN).
      this.viewBox = [x, y, width, height].map(n => Number.parseFloat(n));
    }

    this.dom.documentElement.setAttribute('viewBox', this.viewBox.join(' '));
    return this.viewBox;
  }

  /**
   Complement the SVG shape by adding dimensions, padding and meta data

   @param {(error: Error|null, shape: SVGShape) => void} cb Completion callback
  */
  complement(cb) {
    runWaterfall([
      // Prepare dimensions
      this._complementDimensions.bind(this),

      // Set padding
      this._addPadding.bind(this),

      // Set meta data
      this._addMetadata.bind(this),
    ], error => {
      // Save the transformed state
      this.svg.ready = new XMLSerializer().serializeToString(this.dom.documentElement);
      cb(error, this);
    });
  }

  /**
   Complement the shape's dimensions

   @param {(error: Error|null) => void} cb Completion callback
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _complementDimensions(cb) {
    if (this.width && this.height) {
      this._setDimensions(cb);
    } else {
      this._determineDimensions(this._setDimensions.bind(this, cb));
    }
  }

  /**
   Determine the shape's dimension by rendering it

   @param {(error: Error|null) => void} cb Completion callback
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _determineDimensions(cb) {
  // Try to use a viewBox attribute for image determination
    if (this.viewBox !== false) {
      this.width = this._round(this.viewBox[2]);
      this.height = this._round(this.viewBox[3]);
    }

    // If the viewBox attribute didn't suffice: Render the SVG image
    if (!this.width || !this.height) {
      try {
        const {width, height} = getDependency('calculate-svg-dimensions', calculateSvgDimensions)(this.getSVG(false));
        this.height = this._round(height);
        this.width = this._round(width);
        cb(null);
      } catch (error) {
        cb(error);
      }
    } else {
      cb(null);
    }
  }

  /**
   Round a number considering the given decimal place precision

   @param {number} n Number
   @returns {number} Rounded number
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _round(n) {
    return Math.round(n * this._precision) / this._precision;
  }

  /**
   Scale the shape if necessary

   @param {(error: Error|null) => void} cb Completion callback
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _setDimensions(cb) {
  // Ensure the original viewBox is set
    this.getViewbox(this.width, this.height);

    const isIncludePadding = ['padding', 'icon'].includes(this.config.spacing.box);
    const isForceScale = this.config.spacing.box === 'icon';
    const horizontalPadding = isIncludePadding * Math.max(0, this.config.spacing.padding.right + this.config.spacing.padding.left);
    const width = this.width + horizontalPadding;
    const verticalPadding = isIncludePadding * Math.max(0, this.config.spacing.padding.top + this.config.spacing.padding.bottom);
    const height = this.height + verticalPadding;

    // Does the shape need to be scaled?
    if (width > this.config.dimension.maxWidth || height > this.config.dimension.maxHeight || (isForceScale && width < this.config.dimension.maxWidth && height < this.config.dimension.maxHeight)) {
      const maxWidth = this.config.dimension.maxWidth - horizontalPadding;
      const maxHeight = this.config.dimension.maxHeight - verticalPadding;
      this._scale = Math.min(maxWidth / this.width, maxHeight / this.height);
      this.width = Math.min(maxWidth, this._round(this.width * this._scale));
      this.height = Math.min(maxHeight, this._round(this.height * this._scale));
    }

    // In "icon" box sizing mode: Resize bounding box and center shape by adding padding
    if (isForceScale) {
      const diffWidth = this.config.dimension.maxWidth - this.width - horizontalPadding;
      const diffHeight = this.config.dimension.maxHeight - this.height - verticalPadding;
      this.config.spacing.padding.left += diffWidth / 2;
      this.config.spacing.padding.right += diffWidth / 2;
      this.config.spacing.padding.top += diffHeight / 2;
      this.config.spacing.padding.bottom += diffHeight / 2;
    }

    const dimensions = this.getDimensions();

    for (const [attr, value] of Object.entries(dimensions)) {
      this.dom.documentElement.setAttribute(attr, value);
    }

    cb(null);
  }

  /**
   Add padding to this shape

   @param {(error: Error|null) => void} cb Completion callback
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _addPadding(cb) {
    const {padding} = this.config.spacing;

    if (padding.top || padding.right || padding.bottom || padding.left) {
    // Update viewBox
      const viewBox = this.getViewbox();
      viewBox[0] -= this.config.spacing.padding.left / this._scale;
      viewBox[1] -= this.config.spacing.padding.top / this._scale;
      viewBox[2] += (this.config.spacing.padding.right + this.config.spacing.padding.left) / this._scale;
      viewBox[3] += (this.config.spacing.padding.top + this.config.spacing.padding.bottom) / this._scale;
      this.setViewbox(viewBox.map(this._round.bind(this)));

      // Update dimensions
      this.setDimensions(this.width + this.config.spacing.padding.right + this.config.spacing.padding.left, this.height + this.config.spacing.padding.top + this.config.spacing.padding.bottom);
    }

    cb(null);
  }

  /**
   Add metadata to this shape

   @param {(error: Error|null) => void} cb Completion callback
  */
  // Polymorphic hook (overridden or dispatched cross-class); `#private` would break dispatch.
  // eslint-disable-next-line unicorn/prefer-private-class-fields
  _addMetadata(cb) {
    const ariaLabelledBy = [];

    // Check if description meta data is available
    if ('description' in this.meta && isString(this.meta.description) && this.meta.description.length > 0) {
      this.description ||= this.dom.documentElement.insertBefore(this.dom.createElementNS(this.DEFAULT_SVG_NAMESPACE, 'desc'), this.dom.documentElement.firstChild);

      this.description.textContent = this.meta.description;
      this.description.setAttribute('id', `${this.id}-desc`);
      ariaLabelledBy.push(`${this.id}-desc`);
    }

    // Check if title meta data is available
    if ('title' in this.meta && isString(this.meta.title) && this.meta.title.length > 0) {
      this.title ||= this.dom.documentElement.insertBefore(this.dom.createElementNS(this.DEFAULT_SVG_NAMESPACE, 'title'), this.dom.documentElement.firstChild);

      this.title.textContent = this.meta.title;
      this.title.setAttribute('id', `${this.id}-title`);
      ariaLabelledBy.push(`${this.id}-title`);
    }

    if (ariaLabelledBy.length > 0) {
      this.dom.documentElement.setAttribute('aria-labelledby', ariaLabelledBy.join(' '));
    } else if (this.dom.documentElement.hasAttribute('aria-labelledby')) {
      this.dom.documentElement.removeAttribute('aria-labelledby');
    }

    cb(null);
  }

  /**
   Apply a namespace prefix to all IDs within the SVG document

   @param {string} ns ID namespace
   */
  // eslint-disable-next-line complexity -- Branching namespace-rewrite logic across ID/classname<->CSS-selector mappings; not worth splitting into sub-methods.
  setNamespace(ns) {
    const isNamespaceIds = Boolean(this.spriter.config.svg.namespaceIDs);
    const isNamespaceClassnames = Boolean(this.spriter.config.svg.namespaceClassnames);

    if (this._namespaced || (!isNamespaceIds && !isNamespaceClassnames)) {
      return;
    }

    // Ensure the shape has been complemented before
    if (!this.svg.ready) {
      throw new NotPermittedError('Shape namespace cannot be set before complementing');
    }

    const namespaceIDPrefix = this.spriter.config.svg.namespaceIDPrefix || '';

    const select = getDependency('xpath', xpath).useNamespaces({svg: this.DEFAULT_SVG_NAMESPACE, xlink: this.XLINK_NAMESPACE});
    let substIds = null;
    let substClassnames = null;

    // If IDs should be namespaced
    if (isNamespaceIds) {
    // Build an ID substitution table (and alter the elements' IDs accordingly)
      substIds = {};
      for (const element of select('//*[@id]', this.dom)) {
        const id = element.getAttribute('id');
        const substId = namespaceIDPrefix + ns + id;
        substIds[`#${id}`] = substId;
        element.setAttribute('id', substId);
      }

      // Substitute ID references in xlink:href attributes
      for (const xlink of select('//@xlink:href', this.dom)) {
        const xlinkValue = xlink.nodeValue;
        if (!xlinkValue.startsWith('data:') && Object.hasOwn(substIds, xlinkValue)) {
          xlink.ownerElement.setAttribute('xlink:href', `#${substIds[xlinkValue]}`);
        }
      }

      // Substitute ID references in href attributes
      for (const href of select('//@href', this.dom)) {
        const hrefValue = href.nodeValue;
        if (!hrefValue.startsWith('data:') && Object.hasOwn(substIds, hrefValue)) {
          href.ownerElement.setAttribute('href', `#${substIds[hrefValue]}`);
        }
      }

      // Substitute ID references in referencing attributes
      for (const refProperty of svgReferenceProperties) {
        for (const ref of select(`//@${refProperty}`, this.dom)) {
          ref.ownerElement.setAttribute(ref.localName, this._replaceIdAndClassnameReferences(ref.nodeValue, substIds, substClassnames, false));
        }
      }

      // Substitute ID references in aria-labelledby attribute
      if (this.dom.documentElement.hasAttribute('aria-labelledby')) {
        const labelledby = this.dom.documentElement.getAttribute('aria-labelledby')
          .split(' ')
          .map(label => Object.hasOwn(substIds, `#${label}`) ? substIds[`#${label}`] : label)
          .join(' ');
        this.dom.documentElement.setAttribute('aria-labelledby', labelledby);
      }
    }

    // If CSS class names should be namespaced
    if (isNamespaceClassnames) {
    // Build a class name substitution table (and alter the elements' class names accordingly)
      substClassnames = {};
      for (const element of select('//*[@class]', this.dom)) {
        const classnames = [];
        const trimmedClassnames = element.getAttribute('class')
          .split(' ')
          .filter(classname => classname.trim());

        for (const classname of trimmedClassnames) {
          const substClassname = ns + classname;
          substClassnames[`.${classname}`] = substClassname;
          classnames.push(substClassname);
        }

        element.setAttribute('class', classnames.join(' '));
      }
    }

    // Substitute ID references in <style> elements
    const styleElements = select('//svg:style', this.dom);
    if (styleElements.length > 0) {
    // We require csso here because it increases the load time significantly
      const csso = getDependency('csso', require('csso'));
      for (const style of select('//svg:style', this.dom)) {
        style.textContent = csso.minifyBlock(this._replaceIdAndClassnameReferences(style.textContent, substIds, substClassnames, true), {restructure: false}).css;
      }
    }

    this._namespaced = true;
  }

  /**
   Reset the shapes namespace
  */
  resetNamespace() {
    if (!(this._namespaced && Boolean(this.spriter.config.svg.namespaceIDs))) {
      return;
    }

    this._namespaced = false;
    this.dom = new DOMParser().parseFromString(this.svg.ready, 'image/svg+xml');
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
  // If ID replacement is to be applied: Replace url()-style ID references
    if (substIds !== null) {
      string_ = string_.replaceAll(/url\s*\(\s*["']?(?<id>[^\s"')]+)["']?\s*\)/gu, (match, id) => `url(${Object.hasOwn(substIds, id) ? `#${substIds[id]}` : id})`);
    }

    return selectors ? this._replaceIdAndClassnameReferencesInCssSelectors(string_, getDependency('cssom', cssom).parse(string_).cssRules, substIds, substClassnames) : string_;
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
    let css = '';

    for (const rule of rules) {
      if (rule.constructor.name === 'CSSFontFaceRule') {
        css += `@font-face${string_.slice(rule.__starts + 1, rule.__ends)}`; // Preserving @font-face rule
        continue;
      }

      let selText = rule.selectorText;

      // @-rule
      if (selText === undefined) {
      // If there's a key text: Copy the CSS rule
        if (rule.keyText) {
          css += string_.slice(rule.__starts, rule.__starts + rule.__ends);

        // Else: Recursively process rule content
        } else if (Array.isArray(rule.cssRules)) {
          const from = string_.slice(rule.__starts, rule.cssRules[0].__starts);
          const middle = this._replaceIdAndClassnameReferencesInCssSelectors(string_, rule.cssRules, substIds, substClassnames);
          const to = string_.slice(rule.cssRules.at(-1).__ends, rule.__ends);
          css += from + middle + to;
        }

      // Regular selector
      } else {
        const origSelText = selText;
        const parse = createParser();
        const selector = parse(selText);
        const ids = [];
        const classnames = new Set();
        const classnameFilter = classname => {
          if (Object.hasOwn(substClassnames, `.${classname}`)) {
            classnames.add(classname);
          }
        };

        const collectRule = selectorRule => {
          for (const item of selectorRule.items) {
            if (item.type === 'Id' && substIds !== null && Object.hasOwn(substIds, `#${item.name}`)) {
              ids.push(item.name);
            } else if (item.type === 'ClassName' && substClassnames !== null && Object.hasOwn(substClassnames, `.${item.name}`)) {
              classnameFilter(item.name);
            }
          }

          if (selectorRule.nestedRule) {
            collectRule(selectorRule.nestedRule);
          }
        };

        for (const selectorRule of selector.rules) {
          collectRule(selectorRule);
        }

        // Substitute IDs within the selector
        if (ids.length > 0) {
          const sortedIds = ids.toSorted((a, b) => b.length - a.length);

          for (const id of sortedIds) {
            selText = selText.split(`#${id}`).join(`#${substIds[`#${id}`]}`);
          }
        }

        // Substitute class names within the selector
        if (classnames.size > 0) {
          const sortedClassnames = [...classnames].toSorted((a, b) => b.length - a.length);
          for (const classname of sortedClassnames) {
            selText = selText.split(`.${classname}`).join(`.${substClassnames[`.${classname}`]}`);
          }
        }

        // Rebuild the selector
        css += selText + string_.slice(rule.__starts + origSelText.length, rule.__ends);
      }
    }

    return css;
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
