
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
import File from 'vinyl';
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
  verbose: mock.fn(),
};
const TEST_FILE = new File({
  contents: Buffer.from('<svg></svg>'),
  path: '/test_base/test_path',
  base: '/test_base/',
  cwd: '/',
});

let mockCalc;

beforeEach(() => {
  mockCalc = mock.fn();
  setDependency(dependencyKeys.svgDimensions, mockCalc);
});

afterEach(() => {
  mock.restoreAll();
  resetDependencies();
});

describe('testing _complementDimensions()', () => {
  it('should call _setDimensions if shape has width and height', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = mock.fn();

    shape.width = 10;
    shape.height = 10;
    mock.method(shape, '_setDimensions');

    shape._complementDimensions(cb);

    assert.ok(shape._setDimensions.mock.calls.some(call => isDeepStrictEqual(call.arguments, [cb])), 'expected a matching call');
  });

  it('should call _determineDimensions and then _setDimensions if shape has no width and height', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = mock.fn();

    shape.width = 0;
    shape.height = 0;
    mock.method(shape, '_determineDimensions').mock.mockImplementation(dimensionCb => dimensionCb(null));
    mock.method(shape, '_setDimensions');

    shape._complementDimensions(cb);

    assert.strictEqual(shape._determineDimensions.mock.callCount(), 1);
    assert.ok(shape._setDimensions.mock.calls.some(call => isDeepStrictEqual(call.arguments, [cb])), 'expected a matching call');
  });

  it('should call the callback with an error and skip _setDimensions if dimension determination fails', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = mock.fn();
    const TEST_ERROR = new Error('dimension calculation failed');

    shape.width = 0;
    shape.height = 0;
    mock.method(shape, '_determineDimensions').mock.mockImplementation(dimensionCb => dimensionCb(TEST_ERROR));
    mock.method(shape, '_setDimensions');

    shape._complementDimensions(cb);

    assert.strictEqual(shape._determineDimensions.mock.callCount(), 1);
    assert.strictEqual(shape._setDimensions.mock.callCount(), 0);
    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_ERROR])), 'expected a matching call');
  });
});

describe('testing _determineDimensions()', () => {
  it('should set viewBox', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = mock.fn();
    mock.method(shape, '_round', () => (20));
    shape._round.mock.mockImplementationOnce(() => (10));
    shape.viewBox = [0, 1, 2, 3];
    shape.width = 1;
    shape.height = 1;

    shape._determineDimensions(cb);

    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape._round.mock.callCount(), 2);
    assert.strictEqual(shape._round.mock.calls[0].arguments[0], 2);
    assert.strictEqual(shape._round.mock.calls[1].arguments[0], 3);
    assert.strictEqual(shape.width, 10);
    assert.strictEqual(shape.height, 20);
  });

  it('should call calculateSvgDimensions', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_WIDTH = 200;
    const TEST_HEIGHT = 100;
    const TEST_SVG = 'svg';

    const cb = mock.fn();
    mock.method(shape, '_round', () => (20));
    shape._round.mock.mockImplementationOnce(() => (10));
    mock.method(shape, 'getSVG').mock.mockImplementationOnce(() => (TEST_SVG));
    shape.width = 0;
    shape.height = 0;

    mockCalc.mock.mockImplementationOnce(() => ({width: TEST_WIDTH, height: TEST_HEIGHT}));
    shape._determineDimensions(cb);

    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.ok(mockCalc.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG])), 'expected a matching call');
    assert.strictEqual(shape._round.mock.callCount(), 2);
    assert.strictEqual(shape._round.mock.calls[0].arguments[0], TEST_HEIGHT);
    assert.strictEqual(shape._round.mock.calls[1].arguments[0], TEST_WIDTH);
  });

  it('should call callback with error raised in calculateSvgDimensions', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const cb = mock.fn();
    const TEST_ERROR = 'test error';
    shape.width = 0;
    shape.height = 0;

    mockCalc.mock.mockImplementation(() => {
      throw new DimensionsCalculationError(TEST_ERROR);
    });
    shape._determineDimensions(cb);

    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [new DimensionsCalculationError(TEST_ERROR)])), 'expected a matching call');
  });
});

describe('testing _setDimensions()', () => {
  it('should set viewbox and call cb', () => {
    const TEST_WIDTH = 300;
    const TEST_HEIGHT = 100;
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.width = TEST_WIDTH;
    shape.height = TEST_HEIGHT;

    const cb = mock.fn();
    mock.method(shape, 'getViewbox').mock.mockImplementationOnce(() => (null));
    shape._setDimensions(cb);

    assert.ok(shape.getViewbox.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_WIDTH, TEST_HEIGHT])), 'expected a matching call');
    assert.ok(cb.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
  });

  it('should set attributes for all dimensions', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_WIDTH = 300;
    const TEST_HEIGHT = 100;
    mock.method(shape.dom.documentElement, 'setAttribute').mock.mockImplementation(() => undefined);
    mock.method(shape, 'getViewbox').mock.mockImplementationOnce(() => (null));
    mock.method(shape, 'getDimensions').mock.mockImplementationOnce(() => ({height: TEST_HEIGHT, width: TEST_WIDTH}));
    shape._setDimensions(mock.fn());

    assert.strictEqual(shape.dom.documentElement.setAttribute.mock.callCount(), 2);
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[0].arguments.includes('height'));
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[0].arguments.includes(TEST_HEIGHT));
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[1].arguments.includes('width'));
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls[1].arguments.includes(TEST_WIDTH));
  });

  describe('shape need to be scaled', () => {
    it('should scale if width is more than maxWidth', () => {
      const TEST_WIDTH = 400;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH;
      shape.height = TEST_HEIGHT;
      shape.config.spacing.box = 'padding';
      shape.config.spacing.padding.right = 10;
      shape.config.spacing.padding.left = 10;
      shape.config.dimension.maxWidth = TEST_WIDTH;

      shape._setDimensions(mock.fn());

      assert.strictEqual(shape._scale, 380 / 400);
      assert.strictEqual(shape.width, 380);
      assert.strictEqual(shape.height, 100 * 380 / 400);
    });

    it('should scale if height is more than maxHeight', () => {
      const TEST_WIDTH = 300;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH;
      shape.height = TEST_HEIGHT;
      shape.config.spacing.box = 'padding';
      shape.config.spacing.padding.top = 10;
      shape.config.spacing.padding.bottom = 10;
      shape.config.dimension.maxHeight = TEST_HEIGHT;

      shape._setDimensions(mock.fn());

      assert.strictEqual(shape.height, 80);
      assert.strictEqual(shape.width, 300 * 80 / 100);
      assert.strictEqual(shape._scale, 0.8);
    });

    it('should scale if height is less than maxHeight and width is less than maxWidth nad spacing is icon', () => {
      const TEST_WIDTH = 300;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH / 2;
      shape.height = TEST_HEIGHT / 2;
      shape.config.spacing.box = 'icon';
      shape.config.dimension.maxHeight = TEST_HEIGHT;
      shape.config.dimension.maxWidth = TEST_WIDTH;

      shape._setDimensions(mock.fn());

      assert.strictEqual(shape._scale, 2);
      assert.strictEqual(shape.height, 100);
      assert.strictEqual(shape.width, 150 * 2);
    });
  });

  describe('with icon box size', () => {
    it('should set expected spacing', () => {
      const TEST_WIDTH = 300;
      const TEST_HEIGHT = 100;
      const shape = createShape(TEST_FILE, TEST_SPRITER);
      shape.width = TEST_WIDTH * 2;
      shape.height = TEST_HEIGHT;
      shape.config.spacing.box = 'icon';
      shape.config.dimension.maxHeight = TEST_HEIGHT;
      shape.config.dimension.maxWidth = TEST_WIDTH;

      shape._setDimensions(mock.fn());

      assert.strictEqual(shape.config.spacing.padding.left, 0);
      assert.strictEqual(shape.config.spacing.padding.right, 0);
      assert.strictEqual(shape.config.spacing.padding.top, 25);
      assert.strictEqual(shape.config.spacing.padding.bottom, 25);
    });
  });
});

describe('testing _addPadding()', () => {
  it('should set viewbox from getViewbox() and add padding from config.spacing.padding', () => {
    const noop = mock.fn();
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    mock.method(shape, 'getViewbox').mock.mockImplementationOnce(() => ([100, 200, 300, 400]));
    mock.method(shape, 'setViewbox');
    mock.method(shape, 'setDimensions');

    shape.config.spacing.padding = {
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    };
    shape._scale = 2;

    shape._addPadding(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.ok(shape.setViewbox.mock.calls.some(call => isDeepStrictEqual(call.arguments, [[80, 195, 330, 420]])), 'expected a matching call');
    assert.ok(shape.setDimensions.mock.calls.some(call => isDeepStrictEqual(call.arguments, [60, 40])), 'expected a matching call');
  });

  it('should set viewbox if config.spacing.padding is zero', () => {
    const noop = mock.fn();
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    mock.method(shape, 'getViewbox');
    mock.method(shape, 'setViewbox');
    mock.method(shape, 'setDimensions');

    shape.config.spacing.padding = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    shape._addPadding(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape.setViewbox.mock.callCount(), 0);
    assert.strictEqual(shape.setDimensions.mock.callCount(), 0);
  });
});

describe('testing _addMetadata()', () => {
  it('should set meta description', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = mock.fn();
    const TEST_DESCRIPTION = 'TEST';

    shape.meta.description = TEST_DESCRIPTION;
    shape.id = 'TEST_ID';
    shape.description = {setAttribute: mock.fn()};
    mock.method(shape.dom.documentElement, 'setAttribute').mock.mockImplementation(() => undefined);

    shape._addMetadata(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape.description.textContent, TEST_DESCRIPTION);
    assert.ok(shape.description.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['id', `${shape.id}-desc`])), 'expected a matching call');
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby', `${shape.id}-desc`])), 'expected a matching call');
  });

  it('should set description if not exists', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = mock.fn();
    const TEST_DESCRIPTION = 'TEST';

    shape.description = null;
    shape.meta.description = TEST_DESCRIPTION;

    shape._addMetadata(noop);

    assert.notStrictEqual(shape.description, null);
    assert.strictEqual(shape.description.toString(), '<desc id="test_path-desc" xmlns="http://www.w3.org/2000/svg">TEST</desc>');
  });

  it('should set meta title', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = mock.fn();
    const TEST_TITLE = 'TEST';

    shape.meta.title = TEST_TITLE;
    shape.id = 'TEST_ID';
    shape.title = {setAttribute: mock.fn()};
    mock.method(shape.dom.documentElement, 'setAttribute').mock.mockImplementation(() => undefined);

    shape._addMetadata(noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
    assert.strictEqual(shape.title.textContent, TEST_TITLE);
    assert.ok(shape.title.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['id', `${shape.id}-title`])), 'expected a matching call');
    assert.ok(shape.dom.documentElement.setAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby', `${shape.id}-title`])), 'expected a matching call');
  });

  it('should set title if not exists', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = mock.fn();
    const TEST_TITLE = 'TEST';

    shape.title = null;
    shape.meta.title = TEST_TITLE;

    shape._addMetadata(noop);

    assert.notStrictEqual(shape.title, null);
    assert.strictEqual(shape.title.toString(), '<title id="test_path-title" xmlns="http://www.w3.org/2000/svg">TEST</title>');
  });

  it('should remove aria-labelledby if neither title or descriptions contains in meta', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const noop = mock.fn();

    mock.method(shape.dom.documentElement, 'hasAttribute').mock.mockImplementationOnce(() => (true));
    mock.method(shape.dom.documentElement, 'removeAttribute');

    shape._addMetadata(noop);

    assert.ok(shape.dom.documentElement.hasAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby'])), 'expected a matching call');
    assert.ok(shape.dom.documentElement.removeAttribute.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['aria-labelledby'])), 'expected a matching call');
  });
});

describe('testing complement()', () => {
  it('should call all functions and set ready state', async () => {
    const testComplementDimensions = mock.fn(fn => fn(null));
    const testAddPadding = mock.fn(fn => fn(null));
    const testAddMetadata = mock.fn(fn => fn(null));
    const noop = mock.fn();

    const shape = createShape(TEST_FILE, TEST_SPRITER);

    shape._complementDimensions = {
      bind() {
        return testComplementDimensions;
      },
    };
    shape._addPadding = {
      bind() {
        return testAddPadding;
      },
    };
    shape._addMetadata = {
      bind() {
        return testAddMetadata;
      },
    };

    shape.complement(noop);

    await new Promise(setImmediate);

    assert.strictEqual(testComplementDimensions.mock.callCount(), 1);
    assert.strictEqual(testAddPadding.mock.callCount(), 1);
    assert.strictEqual(testAddMetadata.mock.callCount(), 1);

    assert.strictEqual(shape.svg.ready.toString(), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null, shape])), 'expected a matching call');
  });
});
