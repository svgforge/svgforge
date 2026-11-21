
/* eslint-disable max-nested-callbacks -- tests legitimately nest callbacks */

import fs from 'node:fs';
import path from 'node:path';
import {Buffer} from 'node:buffer';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import SpriteFile from '../../lib/svgforge/file.js';
import SVGSpriter from '../../lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_SVG = '../fixture/svg/single/weather-clear.svg';
const TEST_EMPTY_SVG = '<svg></svg>';

describe('testing SVGSpriter', () => {
  let spriter;

  beforeEach(t => {
    spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
      },
    });
  });

  describe('testing add()', () => {
    describe('testing adding file object', () => {
      it('should transform file.base of File object with path.resolve and add to _queue as file object', t => {
        const TEST_FILE = new SpriteFile({
          base: path.dirname(TEST_SVG),
          path: TEST_SVG,
          contents: fs.readFileSync(path.join(__dirname, TEST_SVG)),
        });

        spriter._queue = {
          add: t.mock.fn(),
        };

        spriter.add(TEST_FILE);

        assert.deepStrictEqual(TEST_FILE.base, path.resolve(TEST_FILE.base));
        assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_FILE])), 'expected a matching call');
      });

      it('should reject a file object with non-Buffer contents', t => {
        assert.throws(() => {
          spriter.add({
            base: path.dirname(TEST_SVG),
            path: TEST_SVG,
            contents: TEST_EMPTY_SVG,
          });
        }, {name: 'ArgumentError', message: 'SVGSpriter.add: File contents must be a Buffer'});
      });
    });

    describe('testing adding non-file object', () => {
      it('should raise an error when passing name with an absolute path', t => {
        assert.throws(() => {
          spriter.add(TEST_SVG, path.resolve(TEST_SVG), TEST_EMPTY_SVG);
        }, Error);
      });

      it('should raise an error when passing less than 3 arguments', t => {
        assert.throws(() => {
          spriter.add(TEST_SVG);
        }, Error);
        assert.throws(() => {
          spriter.add(TEST_SVG, null);
        }, Error);
      });

      it('should throw an error if passed file arg is empty', t => {
        assert.throws(() => {
          spriter.add('', null, TEST_EMPTY_SVG);
        }, Error);
      });

      it('should throw an error if passed name arg is empty and file path is not valid', t => {
        assert.throws(() => {
          spriter.add(' ', '../', TEST_EMPTY_SVG);
        }, Error);
      });

      it('should throw an error if passed svg arg is empty', t => {
        assert.throws(() => {
          spriter.add(TEST_SVG, null, '');
        }, Error);
        assert.throws(() => {
          spriter.add(TEST_SVG, null, ' ');
        }, Error);
      });

      it('should throw an error if passed name differs from the ending of passed file path', t => {
        assert.throws(() => {
          spriter.add(TEST_SVG, 'absolutely-random-string', TEST_EMPTY_SVG);
        }, Error);
      });

      it('should create file object from passed relative file and add it to _queue', t => {
        spriter._queue = {
          add: t.mock.fn(),
        };
        spriter.add(TEST_SVG, 'weather-clear.svg', TEST_EMPTY_SVG);

        const resolvedTestSvg = path.resolve(TEST_SVG);
        const expectedFile = new SpriteFile({
          base: path.dirname(resolvedTestSvg),
          path: resolvedTestSvg,
          contents: Buffer.from(TEST_EMPTY_SVG),
        });
        assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [expectedFile])), 'expected a matching call');
      });

      for (const name of [null, undefined, '']) {
        it(`should create file object with file name if name is ${String(name)}`, () => {
          spriter._queue = {
            add: mock.fn(), // eslint-disable-line node-test/prefer-context-mock -- module-scope mock
          };
          spriter.add(TEST_SVG, name, TEST_EMPTY_SVG);

          const resolvedTestSvg = path.resolve(TEST_SVG);
          const expectedFile = new SpriteFile({
            base: path.dirname(resolvedTestSvg),
            path: resolvedTestSvg,
            contents: Buffer.from(TEST_EMPTY_SVG),
          });
          assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [expectedFile])), 'expected a matching call');
        });
      }

      it('should create file object from passed absolute file and add it to _queue', t => {
        spriter._queue = {
          add: t.mock.fn(),
        };
        spriter.add(path.resolve(TEST_SVG), 'weather-clear.svg', TEST_EMPTY_SVG);

        const resolvedTestSvg = path.resolve(TEST_SVG);
        const expectedFile = new SpriteFile({
          base: path.dirname(resolvedTestSvg),
          path: resolvedTestSvg,
          contents: Buffer.from(TEST_EMPTY_SVG),
        });
        assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [expectedFile])), 'expected a matching call');
      });
    });
  });
});

describe('testing transform', () => {
  it('should call all transformations', async t => {
    const testTransformFunction = t.mock.fn();
    const spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
        transform: [
          'svgo',
          {
            custom(_, __, callback) {
              testTransformFunction();
              callback(null);
            },
          },
        ],
      },
    });

    const testSvgPath = path.join(__dirname, TEST_SVG);
    spriter.add(new SpriteFile({
      base: path.dirname(TEST_SVG),
      path: TEST_SVG,
      contents: fs.readFileSync(testSvgPath),
    }));

    await spriter.compile({css: true});

    assert.ok(testTransformFunction.mock.calls.some(call => isDeepStrictEqual(call.arguments, [])), 'expected a matching call');
  });
});
