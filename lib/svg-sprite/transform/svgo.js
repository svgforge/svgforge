import merge from 'lodash.merge';
import {optimize as defaultOptimize} from 'svgo';
import pretty from 'prettysize';
import {getDependency} from '../../deps.js';

/**
 SVGO transformation

 @param {SVGShape} shape SVG shape
 @param {object} config Transform configuration
 @param {SVGSpriter} spriter Spriter instance
 @param {(error: Error | null) => void} cb Callback on completion
 */
export default function optimizeWithSvgo(shape, config, spriter, cb) {
  // Svgo 4 no longer removes viewBox / <title> by default, but svg-sprite's
  // sprite & dimensions pipeline relies on them being stripped, so re-enable
  // them explicitly to preserve the previous output.
  const defaultPluginsConfig = ['preset-default', {
    name: 'removeViewBox',
  }, {
    name: 'removeTitle',
  }];

  config = merge({}, config);
  config.plugins = 'plugins' in config ? config.plugins : defaultPluginsConfig;

  if (!spriter.config.svg.xmlDeclaration) {
    // Remove xml declaration if config.svg.xmlDeclaration is falsy
    config.plugins.push({
      name: 'removeXMLProcInst',
    });
  }

  if (!spriter.config.svg.doctypeDeclaration) {
    // Remove docType if config.svg.doctypeDeclaration is falsy
    config.plugins.push({
      name: 'removeDoctype',
    });
  }

  const svg = shape.getSVG(false);
  const svgLength = svg.length;

  const optimize = getDependency('svgo:optimize', defaultOptimize);

  try {
    const result = optimize(svg, config);
    shape.setSVG(result.data);
    let optSVGLength = null;

    for (const transport of spriter.config.log.transports) {
      if (transport.level !== 'debug') {
        continue;
      }

      optSVGLength ||= shape.getSVG(false).length;
      const size = svgLength - optSVGLength;
      const percentage = Math.round(100 * size / svgLength);
      spriter.debug('Optimized "%s" with SVGO (saved %s / %s%%)', shape.name, pretty(size), percentage);
    }

    cb(null);
  } catch (error) {
    spriter.error('Optimizing "%s" with SVGO failed with error "%s"', shape.name, error);
    cb(error);
  }
}
