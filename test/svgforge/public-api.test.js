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
import SVGSpriter, {
  createSpriter as createSpriterFactory,
  ArgumentError,
  DimensionsCalculationError,
  NotPermittedError,
  XmlFixingError,
} from '../../lib/index.js';
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

describe('public API', () => {
  beforeAll(async () => {
    await removeTmpPath(temporaryPath);
  });

  describe('entry point', () => {
    it('default-exports a factory function', () => {
      assert.strictEqual(typeof SVGSpriter, 'function');
    });

    it('exposes named exports for the factory and error classes', () => {
      assert.strictEqual(typeof createSpriterFactory, 'function');
      assert.strictEqual(ArgumentError.name, 'ArgumentError');
      assert.strictEqual(DimensionsCalculationError.name, 'DimensionsCalculationError');
      assert.strictEqual(NotPermittedError.name, 'NotPermittedError');
      assert.strictEqual(XmlFixingError.name, 'XmlFixingError');
    });

    it('creates a spriter when called with new, as documented', () => {
      const spriter = new SVGSpriter({dest: temporaryPath});

      assert.strictEqual(typeof spriter.add, 'function');
      assert.strictEqual(typeof spriter.compile, 'function');
      // CompileAsync removed in 4.0; compile() returns a Promise.
      assert.strictEqual(typeof spriter.getShapes, 'function');
    });

    it('creates a spriter when called without new (upstream parity)', () => {
      // eslint-disable-next-line new-cap -- Deliberate: the default export is a factory callable with and without `new`, like upstream svg-sprite.
      const spriter = SVGSpriter({dest: temporaryPath});

      assert.strictEqual(typeof spriter.add, 'function');
      assert.strictEqual(typeof spriter.compile, 'function');
      // CompileAsync removed in 4.0; compile() returns a Promise.
      assert.strictEqual(typeof spriter.getShapes, 'function');
    });
  });

  describe('compile()', () => {
    it('returns a Promise resolving to {result, data}', async () => {
      const {result} = await createSpriter().compile({symbol: {}});

      assert.deepStrictEqual(Object.keys(result), ['symbol']);
    });

    it('uses configured modes when called without config', async () => {
      const {result} = await createSpriter({symbol: {}}).compile();

      assert.deepStrictEqual(Object.keys(result), ['symbol']);
    });

    it('emits "compiled" after a run', async () => {
      const spriter = createSpriter({symbol: {}});
      const compiled = new Promise(resolve => {
        spriter.once('compiled', () => resolve(true));
      });

      await spriter.compile();

      assert.strictEqual(await compiled, true);
    });
  });

  describe('output modes', () => {
    it('compiles every supported mode in one run', async () => {
      const spriter = createSpriter();
      const {result} = await spriter.compile({
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
