/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {XMLSerializer} from '@xmldom/xmldom';
import {dependencyKeys, getDependency} from '../../deps.js';
import calculateSvgDimensions from '../utils/calculate-svg-dimensions.js';
import {isString} from '../utils/index.js';

/**
 Return the dimensions of this shape

 @param {SVGShape} shape Shape instance
 @returns {object} Width and height of the shape
*/
export function getDimensions(shape) {
  return {
    width: shape.width,
    height: shape.height,
  };
}

/**
 Set the dimensions of this shape

 @param {SVGShape} shape Shape instance
 @param {number} width New width value
 @param {number} height New height value
 @returns {SVGShape} Self reference
*/
export function setDimensions(shape, width, height) {
  // Width/height may carry a unit suffix (e.g. '48px'), so keep `parseFloat`.
  // eslint-disable-next-line unicorn/prefer-number-coercion
  shape.width = shape._round(Math.max(0, Number.parseFloat(width)));
  shape.dom.documentElement.setAttribute('width', shape.width);
  // eslint-disable-next-line unicorn/prefer-number-coercion
  shape.height = shape._round(Math.max(0, Number.parseFloat(height)));
  shape.dom.documentElement.setAttribute('height', shape.height);
  return shape;
}

/**
 Return the shape's viewBox (and set it if it doesn't exist yet)

 @param {SVGShape} shape Shape instance
 @param {number} width Optional width override
 @param {number} height Optional height override
 @returns {Array} Four-element viewBox array
*/
export function getViewbox(shape, width, height) {
  if (!shape.viewBox) {
    shape.setViewbox(0, 0, width || shape.width, height || shape.height);
  }

  return shape.viewBox;
}

/**
 Set the shape's viewBox

 @param {SVGShape} shape Shape instance
 @param {number|Array} x X coordinate or full viewBox array
 @param {number} [y] Y coordinate
 @param {number} [width] New shape width
 @param {number} [height] New shape height
 @returns {Array} Updated viewBox array
*/
// eslint-disable-next-line max-params -- Shape context is passed explicitly after delegation removal.
export function setViewbox(shape, x, y, width, height) {
  if (Array.isArray(x)) {
    // eslint-disable-next-line unicorn/prefer-number-coercion
    shape.viewBox = x.map(n => Number.parseFloat(n));
    while (shape.viewBox.length < 4) {
      shape.viewBox.push(0);
    }
  } else {
    // eslint-disable-next-line unicorn/prefer-number-coercion -- ViewBox components use `parseFloat` semantics (empty strings yield NaN).
    shape.viewBox = [x, y, width, height].map(n => Number.parseFloat(n));
  }

  shape.dom.documentElement.setAttribute('viewBox', shape.viewBox.join(' '));
  return shape.viewBox;
}

/**
 Complement the SVG shape by adding dimensions, padding and meta data

 @param {SVGShape} shape Shape instance
 @returns {Promise<SVGShape>} Complemented shape
*/
export async function complement(shape) {
  try {
    await shape._complementDimensions();
    await shape._addPadding();
    await shape._addMetadata();
  } finally {
    // Save the transformed state
    shape.svg.ready = new XMLSerializer().serializeToString(shape.dom.documentElement);
  }

  return shape;
}

/**
 Complement the shape's dimensions

 @param {SVGShape} shape Shape instance
 @returns {Promise<void>}
*/
export async function _complementDimensions(shape) {
  if (shape.width && shape.height) {
    await shape._setDimensions();
  } else {
    await shape._determineDimensions();
    await shape._setDimensions();
  }
}

/**
 Determine the shape's dimension by rendering it

 @param {SVGShape} shape Shape instance
 @returns {Promise<void>}
*/
export async function _determineDimensions(shape) {
  // Try to use a viewBox attribute for image determination
  if (shape.viewBox !== false) {
    shape.width = shape._round(shape.viewBox[2]);
    shape.height = shape._round(shape.viewBox[3]);
  }

  // If the viewBox attribute didn't suffice: Render the SVG image
  if (shape.width && shape.height) {
    return;
  }

  const dimensionsFn = getDependency(dependencyKeys.svgDimensions, calculateSvgDimensions);
  const {width, height} = await dimensionsFn(shape.getSVG(false));
  shape.height = shape._round(height);
  shape.width = shape._round(width);
}

/**
 Round a number considering the given decimal place precision

 @param {SVGShape} shape Shape instance
 @param {number} n Number
 @returns {number} Rounded number
*/
export function _round(shape, n) {
  return Math.round(n * shape._precision) / shape._precision;
}

/**
 Scale the shape if necessary

 @param {SVGShape} shape Shape instance
 @returns {Promise<void>}
*/
export async function _setDimensions(shape) {
  // Ensure the original viewBox is set
  shape.getViewbox(shape.width, shape.height);

  const isIncludePadding = ['padding', 'icon'].includes(shape.config.spacing.box);
  const isForceScale = shape.config.spacing.box === 'icon';
  const horizontalPadding = isIncludePadding * Math.max(0, shape.config.spacing.padding.right + shape.config.spacing.padding.left);
  const width = shape.width + horizontalPadding;
  const verticalPadding = isIncludePadding * Math.max(0, shape.config.spacing.padding.top + shape.config.spacing.padding.bottom);
  const height = shape.height + verticalPadding;

  // Does the shape need to be scaled?
  if (width > shape.config.dimension.maxWidth || height > shape.config.dimension.maxHeight || (isForceScale && width < shape.config.dimension.maxWidth && height < shape.config.dimension.maxHeight)) {
    const maxWidth = shape.config.dimension.maxWidth - horizontalPadding;
    const maxHeight = shape.config.dimension.maxHeight - verticalPadding;
    shape._scale = Math.min(maxWidth / shape.width, maxHeight / shape.height);
    shape.width = Math.min(maxWidth, shape._round(shape.width * shape._scale));
    shape.height = Math.min(maxHeight, shape._round(shape.height * shape._scale));
  }

  // In "icon" box sizing mode: Resize bounding box and center shape by adding padding
  if (isForceScale) {
    const diffWidth = shape.config.dimension.maxWidth - shape.width - horizontalPadding;
    const diffHeight = shape.config.dimension.maxHeight - shape.height - verticalPadding;
    shape.config.spacing.padding.left += diffWidth / 2;
    shape.config.spacing.padding.right += diffWidth / 2;
    shape.config.spacing.padding.top += diffHeight / 2;
    shape.config.spacing.padding.bottom += diffHeight / 2;
  }

  const dimensions = shape.getDimensions();

  for (const [attr, value] of Object.entries(dimensions)) {
    shape.dom.documentElement.setAttribute(attr, value);
  }
}

/**
 Add padding to this shape

 @param {SVGShape} shape Shape instance
 @returns {Promise<void>}
*/
export async function _addPadding(shape) {
  const {padding} = shape.config.spacing;

  if (!(padding.top || padding.right || padding.bottom || padding.left)) {
    return;
  }

  // Update viewBox
  const viewBox = shape.getViewbox();
  viewBox[0] -= shape.config.spacing.padding.left / shape._scale;
  viewBox[1] -= shape.config.spacing.padding.top / shape._scale;
  viewBox[2] += (shape.config.spacing.padding.right + shape.config.spacing.padding.left) / shape._scale;
  viewBox[3] += (shape.config.spacing.padding.top + shape.config.spacing.padding.bottom) / shape._scale;
  shape.setViewbox(viewBox.map(shape._round.bind(shape)));

  // Update dimensions
  shape.setDimensions(shape.width + shape.config.spacing.padding.right + shape.config.spacing.padding.left, shape.height + shape.config.spacing.padding.top + shape.config.spacing.padding.bottom);
}

/**
 Add metadata to this shape

 @param {SVGShape} shape Shape instance
 @returns {Promise<void>}
*/
export async function _addMetadata(shape) {
  const ariaLabelledBy = [];
  const hasTitle = 'title' in shape.meta && isString(shape.meta.title) && shape.meta.title.length > 0;
  const shouldAutoTitle = !hasTitle && shape.config?.accessibility?.autoTitle === true;

  // Check if description meta data is available
  if ('description' in shape.meta && isString(shape.meta.description) && shape.meta.description.length > 0) {
    shape.description ||= shape.dom.documentElement.insertBefore(shape.dom.createElementNS(shape.DEFAULT_SVG_NAMESPACE, 'desc'), shape.dom.documentElement.firstChild);

    shape.description.textContent = shape.meta.description;
    shape.description.setAttribute('id', `${shape.id}-desc`);
    ariaLabelledBy.push(`${shape.id}-desc`);
  }

  // Check if title meta data is available
  if (hasTitle || shouldAutoTitle) {
    const title = hasTitle
      ? shape.meta.title
      : String(shape.base || shape.id)
        .replaceAll(/[-_~]+/gu, ' ')
        .replaceAll(/\s+/gu, ' ')
        .trim()
        .replaceAll(/\b\p{Letter}/gu, char => char.toUpperCase());

    shape.title ||= shape.dom.documentElement.insertBefore(shape.dom.createElementNS(shape.DEFAULT_SVG_NAMESPACE, 'title'), shape.dom.documentElement.firstChild);

    shape.title.textContent = title;
    shape.title.setAttribute('id', `${shape.id}-title`);
    ariaLabelledBy.push(`${shape.id}-title`);
  }

  if (ariaLabelledBy.length > 0) {
    shape.dom.documentElement.setAttribute('aria-labelledby', ariaLabelledBy.join(' '));
    if (!shape.dom.documentElement.hasAttribute('role')) {
      shape.dom.documentElement.setAttribute('role', 'img');
    }
  } else if (shape.dom.documentElement.hasAttribute('aria-labelledby')) {
    shape.dom.documentElement.removeAttribute('aria-labelledby');
  }
}
