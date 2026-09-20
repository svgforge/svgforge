import {Resvg as defaultResvg} from '@resvg/resvg-js';
import DimensionsCalculationError from '../errors/dimensions-calculation-error.js';
import {getDependency} from '../../deps.js';

/**
 @typedef {object} Dimension
 @property {number} width Width in pixels
 @property {number} height Height in pixels
 */

/**
 Calculate an SVG rendered dimensions.

 @param {string} svg SVG source string
 @returns {Dimension} dimension
 */
export default function calculateSvgDimensions(svg) {
  try {
    const {Resvg} = getDependency('@resvg/resvg-js', {Resvg: defaultResvg});
    const {width, height} = new Resvg(svg, {
      logLevel: 'error',
      font: {
        loadSystemFonts: false, // It will be faster to disable loading system fonts.
      },
    });

    return {width, height};
  } catch (error) {
    throw new DimensionsCalculationError(error);
  }
}
