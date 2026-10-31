
/* eslint-disable new-cap -- tests instantiate mode classes */

import path from 'node:path';
import {Buffer} from 'node:buffer';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import File from 'vinyl';
import SVGSpriteBase from '../../../lib/svgforge/mode/base.js';
import ArgumentError from '../../../lib/svgforge/errors/argument-error.js';
import {dependencyKeys, setDependency, resetDependencies} from '../../../lib/deps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  mock.restoreAll();
  resetDependencies();
});

describe('testings SVGSpriteBase', () => {
  const TEST_MODE_NAME = 'base';
  const getClassAndInitFn = () => {
    const initFn = mock.fn();
    return {
      cls: class TestMode extends SVGSpriteBase {
        _init() {
          initFn();
        }

        get mode() {
          return TEST_MODE_NAME;
        }
      },
      initFn,
    };
  };

  describe('testing constructor', () => {
    it('should set default values', () => {
      const TEST_SPRITER = {
        config: {
          dest: '.',
          shape: {
            spacing: [],
          },
        },
        debug: mock.fn(),
      };
      const TEST_CONFIG = {
        dest: '.',
        prefix: '1',
        sprite: '',
      };
      const TEST_DATA = {};

      const {cls, initFn} = getClassAndInitFn();
      const base = new cls(TEST_SPRITER, TEST_CONFIG, TEST_DATA, '');

      assert.ok(initFn.mock.calls.some(call => isDeepStrictEqual(call.arguments, [])), 'expected a matching call');

      assert.strictEqual(base._spriter, TEST_SPRITER);
      assert.strictEqual(base.config, TEST_CONFIG);
      assert.strictEqual(base.data, TEST_DATA);
      assert.strictEqual(base.data.mode, TEST_MODE_NAME);
      assert.strictEqual(base.data.key, TEST_MODE_NAME);

      assert.strictEqual(base.config.dest, path.resolve(TEST_SPRITER.config.dest, TEST_CONFIG.dest));
      assert.strictEqual(base.config.bust, false);
      assert.strictEqual(base.config.prefix, '1%s');
      assert.strictEqual(base.config.sprite, path.resolve(TEST_CONFIG.dest, 'sprite.svg'));
      assert.strictEqual(base._cssDest, TEST_CONFIG.dest);
      assert.strictEqual(base.tmpl, 'common');
    });

    describe('testing render', () => {
      it('should update config.render as expected', () => {
        const TEST_SPRITER = {
          config: {
            dest: '.',
            shape: {
              spacing: [],
            },
          },
          debug: mock.fn(),
        };
        const TEST_CONFIG = {
          dest: '.',
          prefix: '1',
          sprite: '',
          render: {
            svg: false,
            png: {},
            jpg: {
              template: 'jpg',
            },
            bmp: {
              dest: 'dest',
            },
            webp: {
              dest: 'here.webp',
            },
            css: {
              dest: 'css-dest/test',
            },
          },
        };
        const TEST_DATA = {};

        const {cls} = getClassAndInitFn();
        const base = new cls(TEST_SPRITER, TEST_CONFIG, TEST_DATA, '');

        assert.partialDeepStrictEqual(base.config.render, {
          png: {
            template: path.resolve(path.dirname(path.dirname(path.dirname(__dirname))), 'tmpl/common/sprite.png.vto'),
            dest: path.join(TEST_CONFIG.dest, 'sprite.png'),
          },
          jpg: {
            template: path.resolve(process.cwd(), 'jpg'),
            dest: path.join(TEST_CONFIG.dest, 'sprite.jpg'),
          },
          bmp: {
            dest: path.resolve(TEST_CONFIG.dest, 'dest.bmp'),
            template: path.resolve(path.dirname(path.dirname(path.dirname(__dirname))), 'tmpl/common/sprite.bmp.vto'),
          },
          webp: {
            dest: path.resolve(TEST_CONFIG.dest, 'here.webp'),
            template: path.resolve(path.dirname(path.dirname(path.dirname(__dirname))), 'tmpl/common/sprite.webp.vto'),
          },
        });
        assert.strictEqual(base._cssDest, TEST_CONFIG.dest);
      });
    });
  });

  describe('testing _initData()', () => {
    it('should log', () => {
      const TEST_SPRITER = {
        config: {
          dest: '.',
          shape: {
            spacing: [],
          },
        },
        debug: mock.fn(),
      };
      const TEST_CONFIG = {
        dest: '.',
        prefix: '1',
        sprite: '',
      };
      const TEST_DATA = {};

      const {cls} = getClassAndInitFn();

      // eslint-disable-next-line no-new
      new cls(TEST_SPRITER, TEST_CONFIG, TEST_DATA, '');

      const expectedDebugArguments = ['Created «%s» sprite instance («%s» mode)', TEST_MODE_NAME, TEST_MODE_NAME];
      assert.ok(TEST_SPRITER.debug.mock.calls.some(call => isDeepStrictEqual(call.arguments, expectedDebugArguments)), 'expected a matching call');
    });

    describe('if example passed', () => {
      it('should create default config if truthy value passed', () => {
        const TEST_SPRITER = {
          config: {
            dest: '.',
            shape: {
              spacing: [],
            },
          },
          debug: mock.fn(),
        };
        const TEST_CONFIG = {
          dest: '.',
          prefix: '1',
          sprite: '',
          example: true,
        };
        const TEST_DATA = {};

        const {cls} = getClassAndInitFn();
        const base = new cls(TEST_SPRITER, TEST_CONFIG, TEST_DATA, '');

        assert.deepStrictEqual(base.config.example, {
          template: path.resolve(path.dirname(path.dirname(path.dirname(__dirname))), path.join('tmpl', TEST_MODE_NAME, 'sprite.vto')),
          dest: path.join(TEST_CONFIG.dest, `sprite.${TEST_MODE_NAME}.html`),
        });
        assert.strictEqual(base.data.example, 'sprite.svg');
      });

      it('should follow passed config', () => {
        const TEST_SPRITER = {
          config: {
            dest: '.',
            shape: {
              spacing: [],
            },
          },
          debug: mock.fn(),
        };
        const TEST_CONFIG = {
          dest: '.',
          prefix: '1',
          sprite: '',
          example: {
            template: 'test_template',
            dest: 'test_dest',
          },
        };
        const TEST_DATA = {};

        const {cls} = getClassAndInitFn();
        const base = new cls(TEST_SPRITER, TEST_CONFIG, TEST_DATA, '');

        assert.deepStrictEqual(base.config.example, {
          template: path.resolve(process.cwd(), TEST_CONFIG.example.template),
          dest: path.resolve(TEST_CONFIG.dest, TEST_CONFIG.example.dest),
        });

        assert.strictEqual(base.data.example, 'sprite.svg');
      });
    });

    it('should reject an example value that is neither true nor an object', () => {
      const TEST_SPRITER = {
        config: {
          dest: '.',
          shape: {
            spacing: [],
          },
        },
        debug: mock.fn(),
      };
      const TEST_CONFIG = {
        dest: '.',
        prefix: '1',
        sprite: '',
        example: 'yes',
      };

      const {cls} = getClassAndInitFn();

      assert.throws(() => new cls(TEST_SPRITER, TEST_CONFIG, {}, ''), ArgumentError);
    });
  });

  describe('testing _buildCSSResources', () => {
    it('should transform passed files', async () => {
      const TEST_SPRITER = {
        config: {
          dest: '.',
          shape: {
            spacing: [],
          },
        },
        _limit: 100,
        debug: mock.fn(),
        verbose: mock.fn(),
      };
      const TEST_CONFIG = {
        dest: '.',
        prefix: '1',
        sprite: '',
        render: {svg: true, png: true, bmp: false},
      };
      const {cls} = getClassAndInitFn();
      const base = new cls(TEST_SPRITER, TEST_CONFIG, {}, '');

      const TEST_FILES = {};
      const testFn = mock.fn();
      const outputs = ['first', 'second'];
      const renderTemplateMock = mock.fn(async () => outputs.shift() ?? '');
      setDependency(dependencyKeys.templateRender, renderTemplateMock);

      base._buildCSSResources(TEST_FILES, testFn);

      await new Promise(setImmediate);

      assert.ok(testFn.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null, [undefined, undefined]])), 'expected a matching call');
      assert.strictEqual(TEST_SPRITER.verbose.mock.callCount(), 2);
      assert.deepStrictEqual(TEST_SPRITER.verbose.mock.calls[0].arguments, ['Created «%s» stylesheet resource', 'svg']);
      assert.deepStrictEqual(TEST_SPRITER.verbose.mock.calls[1].arguments, ['Created «%s» stylesheet resource', 'png']);
      assert.deepStrictEqual(TEST_FILES, {
        svg: new File({
          base: TEST_SPRITER.config.dest,
          path: path.join(TEST_CONFIG.dest, 'sprite.svg'),
          contents: Buffer.from('first'),
        }),
        png: new File({
          base: TEST_SPRITER.config.dest,
          path: path.join(TEST_CONFIG.dest, 'sprite.png'),
          contents: Buffer.from('second'),
        }),
      });
    });
  });

  describe('testing _buildHTMLExample()', () => {
    it('should add example in files', async () => {
      const TEST_SPRITER = {
        config: {
          dest: '.',
          shape: {
            spacing: [],
          },
        },
        _limit: 100,
        debug: mock.fn(),
        verbose: mock.fn(),
      };
      const TEST_CONFIG = {
        dest: '.',
        prefix: '1',
        sprite: '',
        example: {
          dest: '.',
        },
      };
      const {cls} = getClassAndInitFn();
      const base = new cls(TEST_SPRITER, TEST_CONFIG, {}, '');
      const testFn = mock.fn();
      const TEST_FILES = {};

      setDependency(dependencyKeys.templateRender, mock.fn(async () => ('test example')));
      base._buildHTMLExample(TEST_FILES, testFn);

      await new Promise(setImmediate);

      assert.ok(testFn.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null, base.data])), 'expected a matching call');
      assert.deepStrictEqual(TEST_FILES, {
        example: new File({
          base: TEST_SPRITER.config.dest,
          path: TEST_CONFIG.example.dest,
          contents: Buffer.from('test example'),
        }),
      });
      assert.ok(TEST_SPRITER.verbose.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Created «%s» HTML example file', TEST_MODE_NAME])), 'expected a matching call');
    });
  });

  describe('testing _addUnit()', () => {
    it('should add unit to number if number is not zero', () => {
      assert.strictEqual(SVGSpriteBase.prototype._addUnit(1, 'px'), '1px');
    });

    it('should not add anything if number is zero', () => {
      assert.strictEqual(SVGSpriteBase.prototype._addUnit(0, 'px'), '0');
    });
  });

  describe('testing declaration()', () => {
    it('should return local declaration if exists', () => {
      const TEST_DECLARATION = 'test declaration';

      assert.strictEqual(SVGSpriteBase.prototype.declaration(true, TEST_DECLARATION), TEST_DECLARATION);
    });

    it('should return empty string if local declaration is falsy', () => {
      assert.strictEqual(SVGSpriteBase.prototype.declaration(true, false), '');
    });

    it('should return global if provided', () => {
      const TEST_DECLARATION = 'test declaration';

      assert.strictEqual(SVGSpriteBase.prototype.declaration(`${TEST_DECLARATION} `), TEST_DECLARATION);
    });

    it('should return empty string if global declaration is not provided', () => {
      assert.strictEqual(SVGSpriteBase.prototype.declaration(), '');
    });
  });

  describe('testing _addCacheBusting()', () => {
    it('should add busting', () => {
      const TEST_SPRITER = {
        config: {
          dest: '.',
          shape: {
            spacing: [],
          },
        },
        _limit: 100,
        debug: mock.fn(),
        verbose: mock.fn(),
      };
      const TEST_CONFIG = {
        dest: '.',
        bust: true,
        prefix: '1',
        sprite: '',
        example: {
          dest: '.',
        },
      };
      const {cls} = getClassAndInitFn();
      const base = new cls(TEST_SPRITER, TEST_CONFIG, {}, '');
      const TEST_SVG = 'svg';
      const TEST_SPRITE_MATCH = /sprite-[\da-z]{8}\.svg/u;

      assert.match(String(base._addCacheBusting(TEST_SVG)), TEST_SPRITE_MATCH);
      assert.match(String(base.data.sprite), TEST_SPRITE_MATCH);
      assert.match(String(base.data.example), TEST_SPRITE_MATCH);
    });
  });
});
