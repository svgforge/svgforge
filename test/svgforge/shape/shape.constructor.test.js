
/* eslint-disable max-nested-callbacks -- tests legitimately nest callbacks */

import path from 'node:path';
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import SpriteFile from '../../../lib/svgforge/file.js';
import createShape from '../../../lib/svgforge/shape/index.js';

describe('testing Shape.constructor', () => {
  describe('testing constructor', () => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<svg>TEST CONTENT</svg>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });

    it('should set expected initial values', t => {
      const TEST_SPRITER = {
        config: {
          shape: {meta: {}},
          id: {},
        },
        verbose: t.mock.fn(),
      };
      const shape = createShape(TEST_FILE, TEST_SPRITER);

      assert.strictEqual(shape.spriter, TEST_SPRITER);
      assert.strictEqual(shape.source, TEST_FILE);
      assert.strictEqual(shape.name, path.basename(TEST_FILE.relative));
      assert.strictEqual(shape.id, path.basename(TEST_FILE.relative));
      assert.strictEqual(shape._precision, 10 ** 2);
      assert.strictEqual(shape._scale, 1);
      assert.strictEqual(shape._namespaced, false);
    });

    describe('config', () => {
      it('should set config from passed spriter.config', t => {
        const TEST_SPRITER = {
          config: {
            shape: {
              meta: {}, TEST: 1, TEST_2: 2,
            },
            id: {},
          },
          verbose: t.mock.fn(),
        };
        const shape = createShape(TEST_FILE, TEST_SPRITER);

        assert.partialDeepStrictEqual(shape.config, {TEST: 1, TEST_2: 2});
      });

      describe('testing generator', () => {
        it('should set default generator if provided generator is not a string', t => {
          const TEST_SPRITER = {
            config: {
              shape: {
                id: {
                  generator: true,
                },
                meta: {},
              },
            },
            verbose: t.mock.fn(),
          };
          const shape = createShape(TEST_FILE, TEST_SPRITER);

          assert.strictEqual(shape.config.id.generator(`test${path.sep}test.f.svg`), 'test--test.f');
          assert.strictEqual(shape.config.id.generator('test 1.svg'), 'test_1');
        });

        it('default generator should keep folder names from relative path', t => {
          const baseFolder = `${path.sep}my${path.sep}full${path.sep}path`;
          const fullPath = `${path.sep}my${path.sep}full${path.sep}path${path.sep}folder${path.sep}test_path.f.svg`;
          const TEST_FILE_WITH_FOLDERS = new SpriteFile({
            contents: Buffer.from('<svg>TEST CONTENT</svg>'),
            base: baseFolder,
            path: fullPath,
            cwd: '/',
          });
          const TEST_SPRITER = {
            config: {
              shape: {
                id: {
                  generator: true,
                },
                meta: {},
              },
            },
            verbose: t.mock.fn(),
          };
          const shape = createShape(TEST_FILE_WITH_FOLDERS, TEST_SPRITER);

          assert.strictEqual(shape.config.id.generator(TEST_FILE_WITH_FOLDERS.relative, TEST_FILE_WITH_FOLDERS), 'folder--test_path.f');
        });

        it('should set generator if provided generator is a string', t => {
          const TEST_SPRITER = {
            config: {
              shape: {
                id: {
                  generator: 'generator',
                },
                meta: {},
              },
            },
            verbose: t.mock.fn(),
          };
          const shape = createShape(TEST_FILE, TEST_SPRITER);

          assert.strictEqual(shape.config.id.generator(`test${path.sep}test.f.svg`), 'generatortest--test.f');
          assert.strictEqual(shape.config.id.generator('test 1.svg'), 'generatortest_1');
        });

        it('should set generator if provided generator is a string with %s', t => {
          const TEST_SPRITER = {
            config: {
              shape: {
                id: {
                  generator: '%s-test',
                },
                meta: {},
              },
            },
            verbose: t.mock.fn(),
          };
          const shape = createShape(TEST_FILE, TEST_SPRITER);

          assert.strictEqual(shape.config.id.generator(`test${path.sep}test.f.svg`), 'test--test.f-test');
          assert.strictEqual(shape.config.id.generator('test 1.svg'), 'test_1-test');
        });

        it('should set generator if provided generator with proper separator', t => {
          const TEST_SPRITER = {
            config: {
              shape: {
                id: {
                  generator: '%s-test',
                  separator: '!',
                },
                meta: {},
              },
            },
            verbose: t.mock.fn(),
          };
          const shape = createShape(TEST_FILE, TEST_SPRITER);

          assert.strictEqual(shape.config.id.generator(`test${path.sep}test.f.svg`), 'test!test.f-test');
          assert.strictEqual(shape.config.id.generator('test 1.svg'), 'test_1-test');
        });

        it('should set generator if provided generator without proper separator', t => {
          const TEST_SPRITER = {
            config: {
              shape: {
                id: {
                  generator: '%s-test',
                  separator: false,
                },
                meta: {},
              },
            },
            verbose: t.mock.fn(),
          };
          const shape = createShape(TEST_FILE, TEST_SPRITER);

          assert.strictEqual(shape.config.id.generator(`test${path.sep}test.f.svg`), 'test.f-test');
          assert.strictEqual(shape.config.id.generator('test 1.svg'), 'test_1-test');
        });
      });
    });

    describe('testing meta', () => {
      it('should set exact meta if provided meta has generated id', t => {
        const TEST_SPRITER = {
          config: {
            shape: {
              meta: {TEST_ID: 'TEST_META'},
              id: {
                generator() {
                  return 'TEST_ID';
                },
              },
            },
          },
          verbose: t.mock.fn(),
        };
        const shape = createShape(TEST_FILE, TEST_SPRITER);

        assert.strictEqual(shape.meta, 'TEST_META');
      });

      it('should set exact meta if provided meta has relative name', t => {
        const TEST_SPRITER = {
          config: {
            shape: {
              meta: {[path.basename(TEST_FILE.relative, '.svg')]: 'TEST_META'},
              id: {
                generator() {
                  return 'TEST_ID';
                },
              },
            },
          },
          verbose: t.mock.fn(),
        };
        const shape = createShape(TEST_FILE, TEST_SPRITER);

        assert.strictEqual(shape.meta, 'TEST_META');
      });
    });
  });
});

