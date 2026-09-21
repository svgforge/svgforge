/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author Felix Müller (https://github.com/joeda1)
 @copyright © 2026 Felix Müller
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {createRequire} from 'node:module';
import {DOMParser} from '@xmldom/xmldom';
import xpath from 'xpath';
import {getDependency} from '../../deps.js';
import NotPermittedError from '../errors/not-permitted-error.js';

const require = createRequire(import.meta.url);

const svgReferenceProperties = ['style', 'fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-end', 'marker-mid'];

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

  // Convert xlink:href attributes to unprefixed href and substitute ID references (if any)
  for (const xlink of select('//@xlink:href', this.dom)) {
    const xlinkValue = xlink.nodeValue;
    if (!xlinkValue.startsWith('data:')) {
      xlink.ownerElement.setAttribute('href', substIds !== null && Object.hasOwn(substIds, xlinkValue) ? `#${substIds[xlinkValue]}` : xlinkValue);
      xlink.ownerElement.removeAttributeNS(this.XLINK_NAMESPACE, 'href');
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
export function resetNamespace() {
  if (!(this._namespaced && Boolean(this.spriter.config.svg.namespaceIDs))) {
    return;
  }

  this._namespaced = false;
  this.dom = new DOMParser().parseFromString(this.svg.ready, 'image/svg+xml');
}
