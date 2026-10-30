/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import path from 'node:path';
import {fileURLToPath} from 'node:url';
import SVGSpriter from '../../lib/svgforge.js';
import {addFixtureFiles} from '../helpers/add-files.js';
import {paths} from '../helpers/constants.js';
import removeTmpPath from '../helpers/remove-temp-path.js';
import {
  beforeAll,
  describe,
  expect,
  it,
} from '../helpers/harness.js';

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
      expect(typeof SVGSpriter).toBe('function');
    });

    it('creates a spriter when called with new, as documented', () => {
      const spriter = new SVGSpriter({dest: temporaryPath});

      expect(typeof spriter.add).toBe('function');
      expect(typeof spriter.compile).toBe('function');
      expect(typeof spriter.compileAsync).toBe('function');
      expect(typeof spriter.getShapes).toBe('function');
    });

    it('creates a spriter when called without new (upstream parity)', () => {
      // eslint-disable-next-line new-cap -- Deliberate: the default export is a factory callable with and without `new`, like upstream svg-sprite.
      const spriter = SVGSpriter({dest: temporaryPath});

      expect(typeof spriter.add).toBe('function');
      expect(typeof spriter.compile).toBe('function');
      expect(typeof spriter.compileAsync).toBe('function');
      expect(typeof spriter.getShapes).toBe('function');
    });
  });

  describe('compile() overloads', () => {
    it('accepts (config, callback)', async () => {
      const {result} = await compileWithCallback(createSpriter(), {symbol: {}});

      expect(Object.keys(result)).toEqual(['symbol']);
    });

    it('accepts (callback) and uses the configured modes', async () => {
      const {result} = await compileWithCallback(createSpriter({symbol: {}}));

      expect(Object.keys(result)).toEqual(['symbol']);
    });

    it('emits "compiled" after a run', async () => {
      const spriter = createSpriter({symbol: {}});
      const compiled = new Promise(resolve => {
        spriter.once('compiled', () => resolve(true));
      });

      await compileWithCallback(spriter);

      expect(await compiled).toBe(true);
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

      expect(Object.keys(result).toSorted((a, b) => a.localeCompare(b))).toEqual(['defs', 'stack', 'symbol', 'view']);

      for (const files of Object.values(result)) {
        expect(Object.keys(files)).toContain('sprite');
      }
    });
  });
});
