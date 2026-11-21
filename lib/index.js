import SVGSpriter from './svgforge/spriter.js';

export {default as ArgumentError} from './svgforge/errors/argument-error.js';
export {default as DimensionsCalculationError} from './svgforge/errors/dimensions-calculation-error.js';
export {default as NotPermittedError} from './svgforge/errors/not-permitted-error.js';
export {default as XmlFixingError} from './svgforge/errors/xml-fixing-error.js';
export {default as SVGSpriter} from './svgforge/spriter.js';

/**
 Module export (constructor wrapper)

 @param {object} config Configuration
 @returns {SVGSpriter} SVGSpriter instance
 */
export default function createSpriter(config = {}) {
  // eslint-disable-next-line new-cap -- constructor-safe wrapper
  return this instanceof createSpriter ? new SVGSpriter(config) : new createSpriter(config);
}

export {createSpriter};
