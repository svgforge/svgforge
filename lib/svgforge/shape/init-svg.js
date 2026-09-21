/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author Felix Müller (https://github.com/joeda1)
 @copyright © 2026 Felix Müller
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {format} from 'node:util';
import {DOMParser} from '@xmldom/xmldom';
import {getDependency} from '../../deps.js';
import fixXMLString from '../utils/fix-xml-string.js';
import ArgumentError from '../errors/argument-error.js';

/**
 Initialize the SVG of this shape

 @returns {SVGShape} Self reference
*/
export function _initSVG() {
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
