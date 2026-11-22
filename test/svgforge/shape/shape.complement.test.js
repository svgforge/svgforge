
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {
  afterEach,
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import SpriteFile from '../../../lib/svgforge/file.js';
import createShape from '../../../lib/svgforge/shape/index.js';
import DimensionsCalculationError from '../../../lib/svgforge/errors/dimensions-calculation-error.js';
import {dependencyKeys, setDependency, resetDependencies} from '../../../lib/deps.js';

const TEST_SPRITER = {
  config: {
    shape: {
      meta: {},
      align: {},
    },
    svg: {
      doctypeDeclaration: '',
    },
  },
  verbose: mock.fn(), // eslint-disable-line node-test/prefer-context-mock -- module-scope mock
};
const TEST_FILE = new SpriteFile({
  contents: Buffer.from('<svg></svg>'),
  path: '/test_base/test_path',
  base: '/test_base/',
  cwd: '/',
});

let mockCalc;

beforeEach(t => {
  mockCalc = t.mock.fn();
  setDependency(dependencyKeys.svgDimensions, mockCalc);
});

afterEach(t => {
  t.mock.restoreAll();
  resetDependencies();
});

describe('testing _complementDimensions()', () => {
  it('should call _setDimensions if shape has width and height', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = t.mock.fn();

    shape.width = 10;
    shape.height = 10;
    t.mock.method(shape, '_setDimensions', async () => {});

    await shape._complementDimensions(cb);

    assert.strictEqual(shape._setDimensions.mock.callCount(), 1);
    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
  });

  it('should call _determineDimensions and then _setDimensions if shape has no width and height', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = t.mock.fn();

    shape.width = 0;
    shape.height = 0;
    t.mock.method(shape, '_determineDimensions', async () => {});
    t.mock.method(shape, '_setDimensions', async () => {});

    await shape._complementDimensions(cb);

    assert.strictEqual(shape._determineDimensions.mock.callCount(), 1);
    assert.strictEqual(shape._setDimensions.mock.callCount(), 1);
    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
  });

  it('should call the callback with an error and skip _setDimensions if dimension determination fails', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = t.mock.fn();
    const TEST_ERROR = new Error('dimension calculation failed');

    shape.width = 0;
    shape.height = 0;
    t.mock.method(shape, '_determineDimensions', async () => {
      throw TEST_ERROR;
    });
    t.mock.method(shape, '_setDimensions', async () => {});

    await shape._complementDimensions(cb);

    assert.strictEqual(shape._determineDimensions.mock.callCount(), 1);
    assert.strictEqual(shape._setDimensions.mock.callCount(), 0);
    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_ERROR])), 'expected a matching call');
  });
});

describe('testing _determineDimensions()', () => {
  it('should set viewBox', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = t.mock.fn();
    t.mock.method(shape, '_round', () => (20));
    shape._round.mock.mockImplementationOnce(() => (10));
    shape.viewBox = [0, 1, 2, 3];
    shape.width = 1;
    shape.height = 1;

    await shape._determineDimensions(cb);

    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape._round.mock.callCount(), 2);
    assert.strictEqual(shape._round.mock.calls[0].arguments[0], 2);
    assert.strictEqual(shape._round.mock.calls[1].arguments[0], 3);
    assert.strictEqual(shape.width, 10);
    assert.strictEqual(shape.height, 20);
  });

  it('should call calculateSvgDimensions', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_WIDTH = 200;
    const TEST_HEIGHT = 100;
    const TEST_SVG = 'svg';

    const cb = t.mock.fn();
    t.mock.method(shape, '_round', () => (20));
    shape._round.mock.mockImplementationOnce(() => (10));
    t.mock.method(shape, 'getSVG').mock.mockImplementationOnce(() => (TEST_SVG));
    shape.width = 0;
    shape.height = 0;

    mockCalc.mock.mockImplementationOnce(() => ({width: TEST_WIDTH, height: TEST_HEIGHT}));
    await shape._determineDimensions(cb);

    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.ok(mockCalc.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG])), 'expected a matching call');
    assert.strictEqual(shape._round.mock.callCount(), 2);
    assert.strictEqual(shape._round.mock.calls[0].arguments[0], TEST_HEIGHT);
    assert.strictEqual(shape._round.mock.calls[1].arguments[0], TEST_WIDTH);
  });

  it('should call callback with error raised in calculateSvgDimensions', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = t.mock.fn();
    const TEST_ERROR = 'test error';
    shape.width = 0;
    shape.height = 0;

    mockCalc.mock.mockImplementation(() => {
      throw new DimensionsCalculationError(TEST_ERROR);
    });
    await shape._determineDimensions(cb);

    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [new DimensionsCalculationError(TEST_ERROR)])), 'expected a matching call');
  });
});

describe('testing _setDimensions()', () => {
  it('should set viewbox and call cb', async t => {
    const TEST_WIDTH = 300;
    const TEST_HEIGHT = 100;
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.width = TEST_WIDTH;
    shape.height = TEST_HEIGHT;

    const cb = t.mock.fn();
    t.mock.method(shape, 'getViewbox').mock.mockImplementationOnce(() => (null));
    await shape._setDimensions(cb);

    assert.ok(shape.getViewbox.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_WIDTH, TEST_HEIGHT])), 'expected a matching call');
    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
  });

  it('should set attributes for all dimensions', t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_WIDTH = 300;
    const TEST_HEIGHT = 100;
    t.mock.method(shape.dom.documentElement, 'setAttribute').mock.mockImplementation(() => undefined);
    t.mock.method(shape, 'getViewbox').mock.mockImplementationOnce(() => (null));
    t.mock.method(shape, 'getDimensions').mock.mockImplementationOnce(() => ({height: TEST_HEIGHT, width: TEST_WIDTH}));
    shape._setDimensions(t.mock.fn());

    assert.strictEqual(shape.dom.documentElement.setAttribute.mock.callCount(), 2);
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[0].arguments.includes('height'));
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[0].arguments.includes(TEST_HEIGHT));
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[1].arguments.includes('width'));
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[1].arguments.includes(TEST_WIDTH));
  });

  describe('shape need to be scaled', () => {
    it('should scale if width is more than maxWidth', t => {
      const TEST_WIDTH = 400;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH;
      shape.height = TEST_HEIGHT;
      shape.config.spacing.box = 'padding';
      shape.config.spacing.padding.right = 10;
      shape.config.spacing.padding.left = 10;
      shape.config.dimension.maxWidth = TEST_WIDTH;

      shape._setDimensions(t.mock.fn());

      assert.strictEqual(shape._scale, 380 / 400);
      assert.strictEqual(shape.width, 380);
      assert.strictEqual(shape.height, 100 * 380 / 400);
    });

    it('should scale if height is more than maxHeight', t => {
      const TEST_WIDTH = 300;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH;
      shape.height = TEST_HEIGHT;
      shape.config.spacing.box = 'padding';
      shape.config.spacing.padding.top = 10;
      shape.config.spacing.padding.bottom = 10;
      shape.config.dimension.maxHeight = TEST_HEIGHT;

      shape._setDimensions(t.mock.fn());

      assert.strictEqual(shape.height, 80);
      assert.strictEqual(shape.width, 300 * 80 / 100);
      assert.strictEqual(shape._scale, 0.8);
    });

    it('should scale if height is less than maxHeight and width is less than maxWidth nad spacing is icon', t => {
      const TEST_WIDTH = 300;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH / 2;
      shape.height = TEST_HEIGHT / 2;
      shape.config.spacing.box = 'icon';
      shape.config.dimension.maxHeight = TEST_HEIGHT;
      shape.config.dimension.maxWidth = TEST_WIDTH;

      shape._setDimensions(t.mock.fn());

      assert.strictEqual(shape._scale, 2);
      assert.strictEqual(shape.height, 100);
      assert.strictEqual(shape.width, 150 * 2);
    });
  });

  describe('with icon box size', () => {
    it('should set expected spacing', t => {
      const TEST_WIDTH = 300;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH * 2;
      shape.height = TEST_HEIGHT;
      shape.config.spacing.box = 'icon';
      shape.config.dimension.maxHeight = TEST_HEIGHT;
      shape.config.dimension.maxWidth = TEST_WIDTH;

      shape._setDimensions(t.mock.fn());

      assert.strictEqual(shape.config.spacing.padding.left, 0);
      assert.strictEqual(shape.config.spacing.padding.right, 0);
      assert.strictEqual(shape.config.spacing.padding.top, 25);
      assert.strictEqual(shape.config.spacing.padding.bottom, 25);
    });
  });
});

describe('testing _addPadding()', () => {
  it('should set viewbox from getViewbox() and add padding from config.spacing.padding', async t => {
    const noop = t.mock.fn();
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    t.mock.method(shape, 'getViewbox').mock.mockImplementationOnce(() => ([100, 200, 300, 400]));
    t.mock.method(shape, 'setViewbox');
    t.mock.method(shape, 'setDimensions');

    shape.config.spacing.padding = {
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    };
    shape._scale = 2;

    await shape._addPadding(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.ok(shape.setViewbox.mock.calls.some(call => isDeepStrictEqual(call.arguments, [[80, 195, 330, 420]])), 'expected a matching call');
    assert.ok(shape.setDimensions.mock.calls.some(call => isDeepStrictEqual(call.arguments, [60, 40])), 'expected a matching call');
  });

  it('should set viewbox if config.spacing.padding is zero', async t => {
    const noop = t.mock.fn();
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    t.mock.method(shape, 'getViewbox');
    t.mock.method(shape, 'setViewbox');
    t.mock.method(shape, 'setDimensions');

    shape.config.spacing.padding = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    await shape._addPadding(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape.setViewbox.mock.callCount(), 0);
    assert.strictEqual(shape.setDimensions.mock.callCount(), 0);
  });
});

describe('testing _addMetadata()', () => {
  it('should set meta description', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = t.mock.fn();
    const TEST_DESCRIPTION = 'TEST';

    shape.meta.description = TEST_DESCRIPTION;
    shape.id = 'TEST_ID';
    shape.description = {setAttribute: t.mock.fn()};
    t.mock.method(shape.dom.documentElement, 'setAttribute').mock.mockImplementation(() => undefined);

    await shape._addMetadata(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape.description.textContent, TEST_DESCRIPTION);
    assert.ok(shape.description.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['id', `${shape.id}-desc`])), 'expected a matching call');
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby', `${shape.id}-desc ${shape.id}-title`])), 'expected a matching call');
  });

  it('should set description if not exists', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = t.mock.fn();
    const TEST_DESCRIPTION = 'TEST';

    shape.description = null;
    shape.meta.description = TEST_DESCRIPTION;

    await shape._addMetadata(noop);

    assert.notStrictEqual(shape.description, null);
    assert.strictEqual(shape.description.toString(), '<desc id="test_path-desc" xmlns="http://www.w3.org/2000/svg">TEST</desc>');
  });

  it('should set meta title', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = t.mock.fn();
    const TEST_TITLE = 'TEST';

    shape.meta.title = TEST_TITLE;
    shape.id = 'TEST_ID';
    shape.title = {setAttribute: t.mock.fn()};
    t.mock.method(shape.dom.documentElement, 'setAttribute').mock.mockImplementation(() => undefined);

    await shape._addMetadata(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape.title.textContent, TEST_TITLE);
    assert.ok(shape.title.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['id', `${shape.id}-title`])), 'expected a matching call');
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby', `${shape.id}-title`])), 'expected a matching call');
  });

  it('should set title if not exists', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = t.mock.fn();
    const TEST_TITLE = 'TEST';

    shape.title = null;
    shape.meta.title = TEST_TITLE;

    await shape._addMetadata(noop);

    assert.notStrictEqual(shape.title, null);
    assert.strictEqual(shape.title.toString(), '<title id="test_path-title" xmlns="http://www.w3.org/2000/svg">TEST</title>');
  });

  it('should remove aria-labelledby if neither title or descriptions contains in meta', async t => {
    const shape = createShape(TEST_FILE, {
      ...TEST_SPRITER,
      config: {
        ...TEST_SPRITER.config,
        shape: {
          ...TEST_SPRITER.config.shape,
          accessibility: {autoTitle: false},
        },
      },
    });
    const noop = t.mock.fn();

    t.mock.method(shape.dom.documentElement, 'hasAttribute').mock.mockImplementationOnce(() => (true));
    t.mock.method(shape.dom.documentElement, 'removeAttribute');

    await shape._addMetadata(noop);

    assert.ok(shape.dom.documentElement.hasAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby'])), 'expected a matching call');
    assert.ok(shape.dom.documentElement.removeAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby'])), 'expected a matching call');
  });
});

describe('testing complement()', () => {
  it('should call all functions and set ready state', async t => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = t.mock.fn();

    t.mock.method(shape, '_complementDimensions', async () => {});
    t.mock.method(shape, '_addPadding', async () => {});
    t.mock.method(shape, '_addMetadata', async () => {});

    await shape.complement(noop);

    assert.strictEqual(shape._complementDimensions.mock.callCount(), 1);
    assert.strictEqual(shape._addPadding.mock.callCount(), 1);
    assert.strictEqual(shape._addMetadata.mock.callCount(), 1);

    assert.strictEqual(shape.svg.ready.toString(), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null, shape])), 'expected a matching call');
  });
});
