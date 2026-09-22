/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {createRequire} from 'node:module';
import {DOMParser} from '@xmldom/xmldom';
import {getDependency} from '../../deps.js';
import NotPermittedError from '../errors/not-permitted-error.js';

const require = createRequire(import.meta.url);

const svgReferenceProperties = ['style', 'fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-end', 'marker-mid'];

/**
 Get all element nodes of a document

 @param {Document} document The DOM document
 @returns {Array} All element nodes
 */
// eslint-disable-next-line unicorn/prefer-query-selector -- `@xmldom/xmldom` provides no `querySelectorAll` API.
const getElements = document => [...document.getElementsByTagName('*')];

/**
 Get all element nodes having the given attribute

 @param {Document} document The DOM document
 @param {string} attribute Attribute name
 @returns {Array} Element nodes with the given attribute
 */
const getElementsByAttribute = (document, attribute) => getElements(document).filter(element => element.hasAttribute(attribute));

/**
 Get all attribute nodes with the given (qualified) name

 @param {Document} document The DOM document
 @param {string} name Attribute name (e.g. `href` or `xlink:href`)
 @returns {Array} Matching attribute nodes
 */
const getAttributesByName = (document, name) => {
  const attributes = [];

  for (const element of getElements(document)) {
    const node = element.getAttributeNode(name);
    if (node) {
      attributes.push(node);
    }
  }

  return attributes;
};

/**
 Apply a namespace prefix to all IDs within the SVG document

 @param {string} ns ID namespace
 */
// eslint-disable-next-line complexity -- Branching namespace-rewrite logic across ID/classname<->CSS-selector mappings; not worth splitting into sub-methods.
export function setNamespace(ns) {
  if (this._namespaced) {
    return;
  }

  // Ensure the shape has been complemented before
  if (!this.svg.ready) {
    throw new NotPermittedError('Shape namespace cannot be set before complementing');
  }

  const isNamespaceIds = Boolean(this.spriter.config.svg.namespaceIDs);
  const isNamespaceClassnames = Boolean(this.spriter.config.svg.namespaceClassnames);
  const namespaceIDPrefix = this.spriter.config.svg.namespaceIDPrefix || '';

  let substIds = null;
  let substClassnames = null;

  // If IDs should be namespaced
  if (isNamespaceIds) {
  // Build an ID substitution table (and alter the elements' IDs accordingly)
    substIds = {};
    for (const element of getElementsByAttribute(this.dom, 'id')) {
      const id = element.getAttribute('id');
      const substId = namespaceIDPrefix + ns + id;
      substIds[`#${id}`] = substId;
      element.setAttribute('id', substId);
    }

    // Substitute ID references in href attributes
    for (const {ownerElement, value} of getAttributesByName(this.dom, 'href')) {
      if (!value.startsWith('data:') && Object.hasOwn(substIds, value)) {
        ownerElement.setAttribute('href', `#${substIds[value]}`);
      }
    }

    // Substitute ID references in referencing attributes
    for (const refProperty of svgReferenceProperties) {
      for (const {ownerElement, localName, value} of getAttributesByName(this.dom, refProperty)) {
        ownerElement.setAttribute(localName, this._replaceIdAndClassnameReferences(value, substIds, substClassnames, false));
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

  // Convert xlink:href attributes to unprefixed href and substitute ID references (if any)
  for (const {ownerElement, nodeValue} of getAttributesByName(this.dom, 'xlink:href')) {
    if (!nodeValue.startsWith('data:')) {
      ownerElement.setAttribute('href', substIds !== null && Object.hasOwn(substIds, nodeValue) ? `#${substIds[nodeValue]}` : nodeValue);
      ownerElement.removeAttributeNS(this.XLINK_NAMESPACE, 'href');
    }
  }

  // If CSS class names should be namespaced
  if (isNamespaceClassnames) {
  // Build a class name substitution table (and alter the elements' class names accordingly)
    substClassnames = {};
    for (const element of getElementsByAttribute(this.dom, 'class')) {
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
  const styleElements = this.dom.getElementsByTagNameNS(this.DEFAULT_SVG_NAMESPACE, 'style');
  if (styleElements.length > 0) {
  // We require csso here because it increases the load time significantly
    const csso = getDependency('csso', require('csso'));
    for (const style of styleElements) {
      style.textContent = csso.minifyBlock(this._replaceIdAndClassnameReferences(style.textContent, substIds, substClassnames, true), {restructure: false}).css;
    }
  }

  this._namespaced = true;
}

/**
 Reset the shapes namespace
*/
export function resetNamespace() {
  if (!(this._namespaced && Boolean(this.spriter.config.svg.namespaceIDs))) {
    return;
  }

  this._namespaced = false;
  this.dom = new DOMParser().parseFromString(this.svg.ready, 'image/svg+xml');
}
