import {DOMParser} from '@xmldom/xmldom';
import XmlFixingError from '../errors/xml-fixing-error.js';

/**
 Fix an SVG string and normalize its whitespace

 @param {string} svgString svg string to fix
 @returns {string} fixed svg string
 */
export default function fixXMLString(svgString) {
  let isDomParserError = false;
  const onError = () => {
    isDomParserError = true;
  };

  const fixedSVG = new DOMParser({onError})
    .parseFromString(svgString, 'image/svg+xml')
    .toString()
    .replaceAll(/\s{2,}/gu, ' ');

  if (!isDomParserError) {
    return fixedSVG;
  }

  throw new XmlFixingError('Invalid XML string');
}
