/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {before as beforeAll, describe, it} from 'node:test';
import SVGSpriter from '../../lib/svgforge.js';
import {addFixtureFiles} from '../../test-utils/add-files.js';
import {paths} from '../../test-utils/constants.js';
import removeTmpPath from '../../test-utils/remove-temp-path.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(__dirname, '../fixture/svg/single');
const temporaryPath = path.join(paths.tmp, 'public-api');

/**
 Create a spriter with one fixture shape

 @param {object} mode Mode configuration
 @returns {SVGSpriter} Spriter instance
 */
const createSpriter = (mode = {}) => {
  const spriter = new SVGSpriter({dest: temporaryPath, mode});
  addFixtureFiles(spriter, ['weather-clear.svg'], fixtureDirectory);

  return spriter;
};

/**
 Compile and resolve the callback result

 @param {SVGSpriter} spriter Spriter instance
 @param {...unknown} arguments_ Arguments passed to compile, without the callback
 @returns {Promise<{result: object, data: object}>} Compilation result
 */
const compileWithCallback = (spriter, ...arguments_) => new Promise((resolve, reject) => {
  spriter.compile(...arguments_, (error, result, data) => {
    if (error) {
      reject(error);
    } else {
      resolve({result, data});
    }
  });
});

describe('public API', () => {
  beforeAll(async () => {
    await removeTmpPath(temporaryPath);
  });

  describe('entry point', () => {
    it('default-exports a factory function', () => {
      assert.strictEqual(typeof SVGSpriter, 'function');
    });

    it('creates a spriter when called with new, as documented', () => {
      const spriter = new SVGSpriter({dest: temporaryPath});

      assert.strictEqual(typeof spriter.add, 'function');
      assert.strictEqual(typeof spriter.compile, 'function');
      assert.strictEqual(typeof spriter.compileAsync, 'function');
      assert.strictEqual(typeof spriter.getShapes, 'function');
    });

    it('creates a spriter when called without new (upstream parity)', () => {
      // eslint-disable-next-line new-cap -- Deliberate: the default export is a factory callable with and without `new`, like upstream svg-sprite.
      const spriter = SVGSpriter({dest: temporaryPath});

      assert.strictEqual(typeof spriter.add, 'function');
      assert.strictEqual(typeof spriter.compile, 'function');
      assert.strictEqual(typeof spriter.compileAsync, 'function');
      assert.strictEqual(typeof spriter.getShapes, 'function');
    });
  });

  describe('compile() overloads', () => {
    it('accepts (config, callback)', async () => {
      const {result} = await compileWithCallback(createSpriter(), {symbol: {}});

      assert.deepStrictEqual(Object.keys(result), ['symbol']);
    });

    it('accepts (callback) and uses the configured modes', async () => {
      const {result} = await compileWithCallback(createSpriter({symbol: {}}));

      assert.deepStrictEqual(Object.keys(result), ['symbol']);
    });

    it('emits "compiled" after a run', async () => {
      const spriter = createSpriter({symbol: {}});
      const compiled = new Promise(resolve => {
        spriter.once('compiled', () => resolve(true));
      });

      await compileWithCallback(spriter);

      assert.strictEqual(await compiled, true);
    });
  });

  describe('output modes', () => {
    it('compiles every supported mode in one run', async () => {
      const spriter = createSpriter();
      const {result} = await spriter.compileAsync({
        view: {},
        defs: {},
        symbol: {},
        stack: {},
      });

      assert.deepStrictEqual(Object.keys(result).toSorted((a, b) => a.localeCompare(b)), ['defs', 'stack', 'symbol', 'view']);

      assert.ok(Object.values(result).every(files => Object.keys(files).includes('sprite')));
    });
  });
});
