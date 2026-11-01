
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
import File from 'vinyl';
import SVGSpriter from '../../lib/svgforge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_SVG = '../fixture/svg/single/weather-clear.svg';
const TEST_EMPTY_SVG = '<svg></svg>';

describe('testing SVGSpriter', () => {
  let spriter;

  beforeEach(() => {
    spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
      },
    });
  });

  describe('testing add()', () => {
    describe('testing adding vinyl file', () => {
      it('should transform file.base of Vinyl file with path.resolve and add to _queue as vinyl file', () => {
        const TEST_FILE = new File({
          base: path.dirname(TEST_SVG),
          path: TEST_SVG,
          contents: fs.readFileSync(path.join(__dirname, TEST_SVG)),
        });

        spriter._queue = {
          add: mock.fn(),
        };

        spriter.add(TEST_FILE);

        assert.deepStrictEqual(TEST_FILE.base, path.resolve(TEST_FILE.base));
        assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_FILE])), 'expected a matching call');
      });
    });

    describe('testing adding non-vinyl file', () => {
      it('should raise an error when passing name with an absolute path', () => {
        assert.throws(() => {
          spriter.add(TEST_SVG, path.resolve(TEST_SVG), TEST_EMPTY_SVG);
        }, Error);
      });

      it('should raise an error when passing less than 3 arguments', () => {
        assert.throws(() => {
          spriter.add(TEST_SVG);
        }, Error);
        assert.throws(() => {
          spriter.add(TEST_SVG, null);
        }, Error);
      });

      it('should throw an error if passed file arg is empty', () => {
        assert.throws(() => {
          spriter.add('', null, TEST_EMPTY_SVG);
        }, Error);
      });

      it('should throw an error if passed name arg is empty and file path is not valid', () => {
        assert.throws(() => {
          spriter.add(' ', '../', TEST_EMPTY_SVG);
        }, Error);
      });

      it('should throw an error if passed svg arg is empty', () => {
        assert.throws(() => {
          spriter.add(TEST_SVG, null, '');
        }, Error);
        assert.throws(() => {
          spriter.add(TEST_SVG, null, ' ');
        }, Error);
      });

      it('should throw an error if passed name differs from the ending of passed file path', () => {
        assert.throws(() => {
          spriter.add(TEST_SVG, 'absolutely-random-string', TEST_EMPTY_SVG);
        }, Error);
      });

      it('should create vinyl file from passed relative file and add it to _queue', () => {
        spriter._queue = {
          add: mock.fn(),
        };
        spriter.add(TEST_SVG, 'weather-clear.svg', TEST_EMPTY_SVG);

        assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [new File({
          base: path.dirname(path.resolve(TEST_SVG)),
          path: path.resolve(TEST_SVG),
          contents: Buffer.from(TEST_EMPTY_SVG),
        })])), 'expected a matching call');
      });

      for (const name of [null, undefined, '']) {
        it(`should create vinyl file with file name if name is ${String(name)}`, () => {
          spriter._queue = {
            add: mock.fn(),
          };
          spriter.add(TEST_SVG, name, TEST_EMPTY_SVG);

          assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [new File({
            base: path.dirname(path.resolve(TEST_SVG)),
            path: path.resolve(TEST_SVG),
            contents: Buffer.from(TEST_EMPTY_SVG),
          })])), 'expected a matching call');
        });
      }

      it('should create vinyl file from passed absolute file and add it to _queue', () => {
        spriter._queue = {
          add: mock.fn(),
        };
        spriter.add(path.resolve(TEST_SVG), 'weather-clear.svg', TEST_EMPTY_SVG);

        assert.ok(spriter._queue.add.mock.calls.some(call => isDeepStrictEqual(call.arguments, [new File({
          base: path.dirname(path.resolve(TEST_SVG)),
          path: path.resolve(TEST_SVG),
          contents: Buffer.from(TEST_EMPTY_SVG),
        })])), 'expected a matching call');
      });
    });
  });
});

describe('testing transform', () => {
  it('should call all transformations', async () => {
    const testTransformFunction = mock.fn();
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

    spriter.add(new File({
      base: path.dirname(TEST_SVG),
      path: TEST_SVG,
      contents: fs.readFileSync(path.join(__dirname, TEST_SVG)),
    }));

    await spriter.compileAsync({css: true});

    assert.ok(testTransformFunction.mock.calls.some(call => isDeepStrictEqual(call.arguments, [])), 'expected a matching call');
  });
});
