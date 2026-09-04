import {Buffer} from 'node:buffer';
import File from 'vinyl';
import {escapeHtml, isFunction} from './utils/index.js';

export default class SVGSprite {
  DEFAULT_SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

  /**
   Create a new SVG sprite

   @param {string} xmlDeclaration Declaration string prepended to the sprite
   @param {string} doctypeDeclaration Doctype string prepended after the XML declaration
   @param {object} rootAttributes Root attributes for the outermost <svg> element
   @param {boolean} addSVGNamespaces Add default SVG namespaces
   @param {Array} transform List of post-processing transform callbacks
   */
  // eslint-disable-next-line max-params -- Each param corresponds to a distinct constructor concern; grouping would obscure the API.
  constructor(xmlDeclaration, doctypeDeclaration, rootAttributes, addSVGNamespaces, transform) {
    this.xmlDeclaration = xmlDeclaration || '';
    this.doctypeDeclaration = doctypeDeclaration || '';
    this.rootAttributes = {...rootAttributes};
    this.transform = transform;
    this.content = [];
    this._serialized = null;

    if (addSVGNamespaces) {
      this.rootAttributes.xmlns = this.DEFAULT_SVG_NAMESPACE;
      this.rootAttributes['xmlns:xlink'] = this.XLINK_NAMESPACE;
    }
  }

  /**
   Add a content string

   @param {string | string[]} content Content string or array of content strings to append
   */
  add(content) {
    if (Array.isArray(content)) {
      this.content.push(...content);
    } else {
      this.content.push(content);
    }

    this._serialized = null;
  }

  /**
   Serialize the SVG sprite

   @returns {string} SVG sprite
   */
  toString() {
    if (this._serialized !== null) {
      return this._serialized;
    }

    let svg = this.xmlDeclaration + this.doctypeDeclaration;
    svg += '<svg';
    for (const [attr, value] of Object.entries(this.rootAttributes)) {
      svg += ` ${attr}="${escapeHtml(value)}"`;
    }

    svg += '>';
    svg += this.content.join('');
    svg += '</svg>';

    // Apply post-processing transformations
    for (const transform of this.transform) {
      if (isFunction(transform)) {
        svg = transform(svg) || '';
      }
    }

    this._serialized = svg;

    return this._serialized;
  }

  /**
   Return as vinyl file

   @param {string} base Base path for the generated file
   @param {string} path Output path for the generated file
   @returns {File} Vinyl file
   */
  toFile(base, path) {
    return new File({
      base,
      path,
      contents: Buffer.from(this.toString()),
    });
  }
}
