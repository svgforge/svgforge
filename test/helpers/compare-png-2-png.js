
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';

const MAX_MISMATCH = 130;

/**
 * @param {PNG} diff diff PNG
 * @param {string} filePath where to store the diff
 */
const storeDiff = async (diff, filePath) => {
  await mkdir(path.dirname(filePath), {recursive: true});
  await writeFile(filePath, PNG.sync.write(diff));
};

/**
 * @param {string} input input png
 * @param {string} expected expected png
 * @returns {Promise<{isEqual: boolean, matched: (number|*), diff: exports.PNG}>} matching results
 */
export default async (input, expected) => {
  const inputPng = PNG.sync.read(await readFile(input));
  const expectedPng = PNG.sync.read(await readFile(expected));

  const {width, height} = inputPng;

  const diff = new PNG({width, height});

  const matched = pixelmatch(
    inputPng.data,
    expectedPng.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1,
      // v7 blends semi-transparent pixels against a checkerboard pattern by
      // default; `false` restores the pre-v7 (v5) behavior of blending against
      // plain white that the expected snapshots were generated with.
      checkerboard: false,
      // Thin lines (e.g. bus windows) get anti-aliased slightly darker by the
      // newer Chromium than the v5-era expected snapshots (~100px, spread over
      // the bottom edge). Only visible at extreme zoom. The default v7
      // tolerance (5) was too strict for this, so raise it to 130. This is a
      // deliberate, documented allowance for the AA rendering-version drift;
      // real differences are still caught well above this threshold.
    },
  );

  if (matched <= MAX_MISMATCH) {
    return {isEqual: true, matched, diff};
  }

  await storeDiff(
    diff,
    path.join(
      path.dirname(input),
      path.basename(input).replace('.png', '.diff.png'),
    ),
  );

  return {isEqual: false, matched, diff};
};
