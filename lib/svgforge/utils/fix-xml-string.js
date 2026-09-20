import {DOMParser} from '@xmldom/xmldom';
import XmlFixingError from '../errors/xml-fixing-error.js';

/**
 Fix an SVG string and normalize its whitespace

 @param {string} svgString svg string to fix
 @returns {string} fixed svg string
 @throws {XmlFixingError} if the string is not valid XML
 */
export default function fixXMLString(svgString) {
  try {
    return new DOMParser()
      .parseFromString(svgString, 'image/svg+xml')
      .toString()
      .replaceAll(/\s{2,}/gu, ' ');
  } catch {
    throw new XmlFixingError('Invalid XML string');
  }
}
