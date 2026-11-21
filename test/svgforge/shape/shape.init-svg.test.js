
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import SpriteFile from '../../../lib/svgforge/file.js';
import createShape from '../../../lib/svgforge/shape/index.js';
import {dependencyKeys, setDependency} from '../../../lib/deps.js';

const TEST_SPRITER = {
  config: {
    shape: {
      meta: {},
      align: {},
    },
  },
  verbose: mock.fn(), // eslint-disable-line node-test/prefer-context-mock -- module-scope mock
};

const mockFixXMLString = mock.fn(); // eslint-disable-line node-test/prefer-context-mock -- module-scope shared mock
setDependency(dependencyKeys.fixXmlString, mockFixXMLString);

afterEach(t => {
  mockFixXMLString.mock.resetCalls();
});

describe('testing _initSVG()', () => {
  it('should call fixXMLString if passed svg is not normal', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('s'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    mockFixXMLString.mock.mockImplementationOnce(() => ('<svg></svg>'));

    createShape(TEST_FILE, spriter);

    assert.ok(mockFixXMLString.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['s'])), 'expected a matching call');
  });

  it('should call fixXMLString and throw error if passed svg is not normal', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('s'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    mockFixXMLString.mock.mockImplementationOnce(() => ('<'));

    assert.throws(() => {
      createShape(TEST_FILE, spriter);
    }, {message: 'Invalid SVG file'});

    assert.ok(mockFixXMLString.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['s'])), 'expected a matching call');
  });

  it('should call fixXMLString and throw error if passed svg is not normal and fixXMLString thrown error', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('s'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    mockFixXMLString.mock.mockImplementation(() => {
      throw new Error('error');
    });

    assert.throws(() => {
      createShape(TEST_FILE, spriter);
    }, {message: 'Invalid SVG file (error)'});
    assert.ok(mockFixXMLString.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['s'])), 'expected a matching call');
  });

  it('should not call fixXMLString if passed svg is normal', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<svg></svg>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    createShape(TEST_FILE, spriter);

    assert.strictEqual(mockFixXMLString.mock.callCount(), 0);
  });

  it('should fill entities', t => {
    const TEST_ENTITIES = [
      '<!ENTITY name1 "value1">',
      '<!ENTITY name2 "value2">',
    ];
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from(`<svg><!DOCTYPE ${TEST_ENTITIES.join('\n')}>&name1;</svg>`),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    const shape = createShape(TEST_FILE, spriter);

    assert.strictEqual(shape.svg.current.replace('\n', ''), '<svg><!DOCTYPE <!ENTITY name1 "value1"><!ENTITY name2 "value2">>value1</svg>');
  });

  it('should throw error if bad svg parsed', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<<ddfasdfasdf>>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    assert.throws(() => {
      createShape(TEST_FILE, spriter);
    }, {message: 'Invalid SVG file (error)'});
  });

  it('should set width and height', t => {
    const TEST_WIDTH = 200;
    const TEST_HEIGHT = 100;

    const TEST_FILE = new SpriteFile({
      contents: Buffer.from(`<svg width="${TEST_WIDTH}" height="${TEST_HEIGHT}"></svg>`),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    const shape = createShape(TEST_FILE, spriter);

    assert.strictEqual(shape.width, TEST_WIDTH);
    assert.strictEqual(shape.height, TEST_HEIGHT);
  });

  it('should set width, height and viewBox to false', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<svg></svg>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    const shape = createShape(TEST_FILE, spriter);

    assert.strictEqual(shape.width, false);
    assert.strictEqual(shape.height, false);
    assert.strictEqual(shape.viewBox, false);
  });

  it('should set expected viewBox', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<svg viewBox="0 1 2 3 4 5 20d ten"></svg>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    const shape = createShape(TEST_FILE, spriter);

    assert.deepStrictEqual(shape.viewBox, [0, 1, 2, 3, 4, 5, 20, NaN]);
  });

  it('should fill viewBox', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<svg viewBox="0 1"></svg>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const spriter = {
      config: {
        shape: {
          meta: {},
          align: {},
        },
      },
      verbose: t.mock.fn(),
    };

    const shape = createShape(TEST_FILE, spriter);

    assert.deepStrictEqual(shape.viewBox, [0, 1, 0, 0]);
  });

  it('should set title and description to null', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<svg></svg>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });

    const shape = createShape(TEST_FILE, TEST_SPRITER);

    assert.strictEqual(shape.title, null);
    assert.strictEqual(shape.description, null);
  });

  it('should set title and description accordingly to svg', t => {
    const TEST_FILE = new SpriteFile({
      contents: Buffer.from('<svg><title>test title</title><desc>test description</desc></svg>'),
      path: '/test_base/test_path',
      base: '/test_base/',
      cwd: '/',
    });
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    assert.strictEqual(shape.title.toString(), '<title xmlns="http://www.w3.org/2000/svg">test title</title>');
    assert.strictEqual(shape.description.toString(), '<desc xmlns="http://www.w3.org/2000/svg">test description</desc>');
  });
});
