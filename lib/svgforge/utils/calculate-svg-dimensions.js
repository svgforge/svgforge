import DimensionsCalculationError from '../errors/dimensions-calculation-error.js';
import {dependencyKeys, getDependency} from '../../deps.js';

/**
 @typedef {object} Dimension
 @property {number} width Width in pixels
 @property {number} height Height in pixels
 */

let resvgModulePromise;

/**
 Lazily load the optional `@resvg/resvg-js` package. Returns the package
 module, or `null` when the package is not installed. The result is cached so
 the package is resolved at most once per process.

 @returns {Promise<object|null>} The package module or `null` if not installed
 */
async function loadResvgModule() {
  if (resvgModulePromise === undefined) {
    resvgModulePromise = import('@resvg/resvg-js').catch(() => null);
  }

  return resvgModulePromise;
}

/**
 Check whether the optional `@resvg/resvg-js` package is installed and can be
 used as the dimension calculation fallback

 @returns {Promise<boolean>} `true` if the package is available
*/
export async function isResvgAvailable() {
  return getDependency(dependencyKeys.resvg, undefined)
    ? true
    : (await loadResvgModule()) !== null;
}

/**
 Calculate an SVG's rendered dimensions. Requires the optionally installed
 `@resvg/resvg-js` package and throws a `DimensionsCalculationError` if it is
 not available.

 @param {string} svg SVG source string
 @returns {Promise<Dimension>} dimension
 */
export default async function calculateSvgDimensions(svg) {
  try {
    // Prefer an explicitly injected implementation (e.g. in tests) over the
    // lazily loaded optional `@resvg/resvg-js` package.
    const injectedModule = getDependency(dependencyKeys.resvg, undefined);
    const resvgPackage = injectedModule ?? await loadResvgModule();
    const Resvg = resvgPackage?.Resvg;

    if (!Resvg) {
      throw new Error('The optional "@resvg/resvg-js" package is not installed, so the dimension fallback is unavailable. '
        + 'Install it with `npm install @resvg/resvg-js` to enable dimension calculation '
        + 'for SVGs without width/height or viewBox attributes.');
    }

    const {width, height} = new Resvg(svg, {
      logLevel: 'error',
      font: {
        loadSystemFonts: false, // It will be faster to disable loading system fonts.
      },
    });

    return {width, height};
  } catch (error) {
    throw new DimensionsCalculationError(error.message, {cause: error});
  }
}
