import SVGSpriter from './svgforge/spriter.js';

/**
 Module export (constructor wrapper)

 @param {object} config Configuration
 @returns {SVGSpriter} SVGSpriter instance
 */
export default function createSpriter(config = {}) {
  // eslint-disable-next-line new-cap -- constructor-safe wrapper
  return this instanceof createSpriter ? new SVGSpriter(config) : new createSpriter(config);
}
