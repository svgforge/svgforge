import {optimize as defaultOptimize} from 'svgo';
import prettySize from '../utils/pretty-size.js';
import {dependencyKeys, getDependency} from '../../deps.js';
import {deepMerge} from '../utils/index.js';
import {isSerializable, optimizeInWorker} from './svgo-pool.js';

/**
 SVGO transformation

 @param {SVGShape} shape SVG shape
 @param {object} config Transform configuration
 @param {SVGSpriter} spriter Spriter instance
 @param {(error: Error | null) => void} [cb] Optional callback on completion
 @returns {Promise<void>|void} Result
 */
export default function optimizeWithSvgo(shape, config, spriter, cb) {
  const promise = optimizeWithSvgoAsync(shape, config, spriter);

  if (typeof cb === 'function') {
    // eslint-disable-next-line unicorn/prefer-then-catch -- keep cb error handling separate from fulfillment handler errors
    promise.then(() => cb(null), error => cb(error));
    return;
  }

  return promise;
}

/**
 Optimize an SVG shape with SVGO.

 @param {SVGShape} shape SVG shape
 @param {object} config Transform configuration
 @param {SVGSpriter} spriter Spriter instance
 @returns {Promise<void>} Resolves when optimization completes
 */
async function optimizeWithSvgoAsync(shape, config, spriter) {
  // Svgo 4 no longer removes viewBox / <title> by default, but the sprite &
  // dimensions pipeline relies on them being stripped, so re-enable them
  // explicitly to preserve the previous output. The preset would also drop the
  // ARIA `role` attribute as an unknown attribute, so keep it explicitly —
  // the symbol mode whitelists `role` for accessible sprites.
  const defaultPluginsConfig = [{
    name: 'preset-default',
    params: {
      overrides: {
        removeUnknownsAndDefaults: {
          keepRoleAttr: true,
        },
      },
    },
  }, {
    name: 'removeViewBox',
  }, {
    name: 'removeTitle',
  }];

  config = deepMerge({}, config);
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

  const optimize = getDependency(dependencyKeys.svgoOptimize, defaultOptimize);
  const workerOptimize = getDependency(dependencyKeys.svgoPoolOptimize, optimizeInWorker);

  const finish = result => {
    shape.setSVG(result.data);
    let optSVGLength = null;

    for (const transport of spriter.config.log.transports) {
      if (transport.level !== 'debug') {
        continue;
      }

      optSVGLength ||= shape.getSVG(false).length;
      const size = svgLength - optSVGLength;
      const percentage = Math.round(100 * size / svgLength);
      spriter.debug('Optimized "%s" with SVGO (saved %s / %s%%)', shape.name, prettySize(size), percentage);
    }
  };

  // Offload the optimization to a worker thread whenever the real SVGO
  // optimizer runs with a config that survives structured cloning. Custom
  // configs containing functions or class instances (e.g. bespoke plugins)
  // cannot be transferred and fall back to in-process optimization.
  const useWorker = optimize === defaultOptimize && isSerializable(config);

  try {
    const result = useWorker ? await workerOptimize(svg, config) : optimize(svg, config);
    finish(result);
  } catch (error) {
    spriter.error('Optimizing "%s" with SVGO failed with error "%s"', shape.name, error);
    throw error;
  }
}
