/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {format} from 'node:util';
import {DOMParser} from '@xmldom/xmldom';
import {dependencyKeys, getDependency} from '../../deps.js';
import fixXMLString from '../utils/fix-xml-string.js';
import ArgumentError from '../errors/argument-error.js';

/**
 Compose the error thrown for an SVG whose XML cannot be parsed

 @param {Error|string} error Underlying error or parser message
 @returns {ArgumentError} Error carrying the most specific reason
 */
function invalidSVGError(error) {
  const reason = error?.cause?.message ?? error?.message ?? String(error);
  const message = format('Invalid SVG file (%s)', reason.replaceAll('\n', ' ').trim());

  return error instanceof Error
    ? new ArgumentError(message, {cause: error})
    : new ArgumentError(message);
}

/**
 Parse an SVG string into a DOM

 Parse errors are collected instead of thrown from the handler: xmldom wraps
 anything thrown inside `onError` into a message like
 `Reporting fatalError "…" caused …`, which buries the actual reason.

 @param {string} svg SVG string to parse
 @returns {Document} Parsed document
 @throws {ArgumentError} If the SVG is not valid XML
 */
function parseSVG(svg) {
  let parseError = null;

  try {
    const dom = new DOMParser({
      onError(level, message) {
        if (parseError === null) {
          parseError = message;
        }
      },
    }).parseFromString(svg, 'image/svg+xml');

    if (parseError === null) {
      return dom;
    }
  } catch (error) {
    parseError ??= error.message;
  }

  throw invalidSVGError(parseError);
}

/**
 Initialize the SVG of this shape

 @param {SVGShape} shape Shape instance
 @returns {SVGShape} Self reference
*/
export function _initSVG(shape) {
  // Basic check for basic SVG file structure
  const validSVGRegExp = /<svg(?:\s+[\d\-:a-z]+=(?<quote>["']).*?\k<quote>)*\s*(?:(?<slash>\/)|(?<content>>[\s\S]*<\/svg))>/iu;
  let svgStart = shape.svg.current.match(validSVGRegExp);

  if (!svgStart) {
    let fixedXMLString = null;

    try {
      fixedXMLString = getDependency(dependencyKeys.fixXmlString, fixXMLString)(shape.svg.current);
      svgStart = fixedXMLString?.match(validSVGRegExp);
    } catch (error) {
      throw invalidSVGError(error);
    }

    if (!svgStart) {
      throw new ArgumentError('Invalid SVG file');
    }

    shape.svg.current = fixedXMLString;
  }

  // Resolve XML entities
  const entityRegExp = /<!ENTITY\s+(?<entityName>\S+)\s+(?<entityQuote>["'])(?<entityValue>.+)\k<entityQuote>>/u;
  const entityMap = {};
  let entityStart = 0;
  let entities = 0;
  let entity;

  do {
    entity = entityRegExp.exec(shape.svg.current.slice(entityStart));
    if (!entity) {
      continue;
    }

    ++entities;
    entityStart += entity.index + entity[0].length;
    entityMap[entity.groups.entityName] = entity.groups.entityValue;
  } while (entity);

  if (entities) {
    let svg = shape.svg.current.slice(svgStart.index);
    for (const [key, value] of Object.entries(entityMap)) {
      svg = svg.replace(`&${key};`, () => value);
    }

    shape.svg.current = shape.svg.current.slice(0, Math.max(0, svgStart.index)) + svg;
  }

  // Strip DOCTYPE+ENTITY declarations before parsing (entities already inlined)
  let svgToParse = shape.svg.current;
  const doctypeMatch = svgToParse.match(/<!DOCTYPE\s+(?:<!ENTITY[^>]*>\s*)*>/u);
  if (doctypeMatch) {
    svgToParse = svgToParse.slice(0, doctypeMatch.index) + svgToParse.slice(doctypeMatch.index + doctypeMatch[0].length);
  }

  // Parse the XML
  shape.dom = parseSVG(svgToParse);

  // Determine the shape width
  const width = shape.dom.documentElement.getAttribute('width');
  // SVG width may carry a unit suffix (e.g. '48px'), so keep `parseFloat`.
  // eslint-disable-next-line unicorn/prefer-number-coercion
  shape.width = width ? Number.parseFloat(width) : false;

  // Determine the shape height
  const height = shape.dom.documentElement.getAttribute('height');
  // eslint-disable-next-line unicorn/prefer-number-coercion
  shape.height = height ? Number.parseFloat(height) : false;

  // Determine the viewbox
  let viewBox = shape.dom.documentElement.getAttribute('viewBox');
  if (viewBox?.length) {
    viewBox = viewBox.split(/[^\d\-.]+/u);
    while (viewBox.length < 4) {
      viewBox.push(0);
    }

    for (const [index, value] of viewBox.entries()) {
      // eslint-disable-next-line unicorn/prefer-number-coercion
      viewBox[index] = Number.parseFloat(value);
    }

    shape.viewBox = viewBox;
  } else {
    shape.viewBox = false;
  }

  shape.title = null;
  shape.description = null;

  const children = shape.dom.documentElement.childNodes;
  const meta = {title: 'title', description: 'desc'};

  for (let child = 0; child < children.length; child++) {
    for (const [m, value] of Object.entries(meta)) {
      if (value === children.item(child).localName) {
        shape[m] = children.item(child);
      }
    }
  }

  return shape;
}
