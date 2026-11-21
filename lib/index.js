import SVGSpriter from './svgforge/spriter.js';

/**
 Module export (constructor wrapper)

 @param {object} config Configuration
 @returns {SVGSpriter} SVGSpriter instance
 */
export default function createSpriter(config = {}) {
  return new SVGSpriter(config);
}
