import assert from 'node:assert/strict';
import path from 'node:path';
import compareHtml2Png from './compare-html-2-png.js';

/**
 Assert that a rendered HTML example matches its expected PNG within the visual
 tolerance.

 @param {string} htmlPath Rendered HTML file
 @param {string} expectedPngPath Expected PNG file
 @returns {Promise<void>} Resolves when the images match
 */
export async function assertVisuallyEqualHTML(htmlPath, expectedPngPath) {
  const {isEqual, matched} = await compareHtml2Png(htmlPath, expectedPngPath);

  assert.ok(isEqual, `${path.basename(htmlPath)} differs from ${path.basename(expectedPngPath)}: ${matched} mismatches`);
}
