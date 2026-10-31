
import assert from 'node:assert/strict';
import {
  afterEach,
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import {dependencyKeys, setDependency, resetDependencies} from '../../../lib/deps.js';
import svgoTransform from '../../../lib/svgforge/transform/svgo.js';

const TEST_SVG = '<svg></svg>';

describe('testing transforms.svgo', () => {
  let noop;
  let mockOptimize;

  beforeEach(() => {
    noop = mock.fn();
    mockOptimize = mock.fn(() => ({data: ''}));
    setDependency(dependencyKeys.svgoOptimize, mockOptimize);
  });

  afterEach(() => {
    mock.restoreAll();
    resetDependencies();
  });

  it('should set default config with expected params if not provided 1', () => {
    const spriter = {
      config: {
        svg: {
          xmlDeclaration: false,
          doctypeDeclaration: false,
        },
      },
      error: mock.fn(),
    };
    const shape = {
      setSVG: mock.fn(),
      getSVG: mock.fn(() => (TEST_SVG)),
    };
    const TEST_RESULT = 'test result';

    mockOptimize.mock.mockImplementationOnce(() => (TEST_RESULT));
    svgoTransform(shape, {}, spriter, noop);

    assert.ok(mockOptimize.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG, {
      plugins: [{
        name: 'preset-default',
        params: {
          overrides: {
            removeUnknownsAndDefaults: {
              keepRoleAttr: true,
            },
          },
        },
      }, {
        name: 'removeViewBox',
      }, {
        name: 'removeTitle',
      }, {
        name: 'removeXMLProcInst',
      }, {
        name: 'removeDoctype',
      }],
    }])), 'expected a matching call');
  });

  it('should set default config with expected params if not provided 2', () => {
    const spriter = {
      config: {
        svg: {
          xmlDeclaration: true,
          doctypeDeclaration: true,
        },
      },
      error: mock.fn(),
    };
    const shape = {
      setSVG: mock.fn(),
      getSVG: mock.fn(() => (TEST_SVG)),
    };
    const TEST_RESULT = 'test result';

    mockOptimize.mock.mockImplementationOnce(() => (TEST_RESULT));
    svgoTransform(shape, {}, spriter, noop);

    assert.ok(mockOptimize.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG, {
      plugins: [{
        name: 'preset-default',
        params: {
          overrides: {
            removeUnknownsAndDefaults: {
              keepRoleAttr: true,
            },
          },
        },
      }, {
        name: 'removeViewBox',
      }, {
        name: 'removeTitle',
      }],
    }])), 'expected a matching call');
  });

  it('should add provided config', () => {
    const TEST_PLUGINS = [{
      name: 'preset-default',
      params: {
        overrides: {
          removeTitle: false,
          removeDesc: false,
        },
      },
    }];
    const spriter = {
      config: {
        svg: {
          xmlDeclaration: true,
          doctypeDeclaration: true,
        },
      },
      error: mock.fn(),
    };
    const shape = {
      setSVG: mock.fn(),
      getSVG: mock.fn(() => (TEST_SVG)),
    };
    const TEST_RESULT = 'test result';

    mockOptimize.mock.mockImplementationOnce(() => (TEST_RESULT));
    svgoTransform(shape, {plugins: TEST_PLUGINS}, spriter, noop);

    assert.strictEqual(mockOptimize.mock.callCount(), 1);
    assert.strictEqual(mockOptimize.mock.calls[0].arguments[0], TEST_SVG);
    assert.ok(TEST_PLUGINS.every(plugin => mockOptimize.mock.calls[0].arguments[1].plugins.some(actual => isDeepStrictEqual(actual, plugin))));
  });

  it('should log about optimizations', () => {
    const MOCKED_ORIGINAL_SVG = 'svgsvg';
    const MOCKED_OPTIMIZED_SVG = 'svg';
    const spriter = {
      config: {
        svg: {},
        log: {
          transports: [{
            level: 'debug',
          }, {
            level: 'debug',
          }],
        },
      },
      error: mock.fn(),
      debug: mock.fn(),
    };
    const shape = {
      name: 'name',
      setSVG: mock.fn(),
      getSVG: mock.fn(() => (MOCKED_OPTIMIZED_SVG)),
    };

    shape.getSVG.mock.mockImplementationOnce(() => (MOCKED_ORIGINAL_SVG));

    mockOptimize.mock.mockImplementationOnce(() => ({}));
    svgoTransform(shape, {}, spriter, noop);

    assert.strictEqual(spriter.debug.mock.callCount(), 2);
    assert.ok(spriter.debug.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Optimized "%s" with SVGO (saved %s / %s%%)', 'name', '3 Bytes', 50])), 'expected a matching call');
  });

  it('should not log about optimizations', () => {
    const spriter = {
      config: {
        svg: {},
        log: {
          transports: [{
            level: 'info',
          }],
        },
      },
      error: mock.fn(),
      debug: mock.fn(),
    };
    const shape = {
      name: 'name',
      setSVG: mock.fn(),
      getSVG: mock.fn(() => (TEST_SVG)),
    };

    mockOptimize.mock.mockImplementationOnce(() => ({}));
    svgoTransform(shape, {}, spriter, noop);

    assert.strictEqual(spriter.debug.mock.callCount(), 0);
  });

  it('should call callback', () => {
    const spriter = {
      config: {
        svg: {},
        log: {
          transports: [],
        },
      },
      error: mock.fn(),
      debug: mock.fn(),
    };
    const shape = {
      name: 'name',
      setSVG: mock.fn(),
      getSVG: mock.fn(() => (TEST_SVG)),
    };

    mockOptimize.mock.mockImplementationOnce(() => ({}));
    svgoTransform(shape, {}, spriter, noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
  });

  it('should call callback with error and call spriter.error if error raised', () => {
    const TEST_ERROR = new Error('test');

    const spriter = {
      config: {
        svg: {},
      },
      error: mock.fn(),
      debug: mock.fn(),
    };
    const shape = {
      name: 'name',
      setSVG: mock.fn(),
      getSVG: mock.fn(() => (TEST_SVG)),
    };

    mockOptimize.mock.mockImplementationOnce(() => {
      throw TEST_ERROR;
    });
    svgoTransform(shape, {}, spriter, noop);

    assert.ok(noop.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_ERROR])), 'expected a matching call');
    assert.ok(spriter.error.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Optimizing "%s" with SVGO failed with error "%s"', 'name', TEST_ERROR])), 'expected a matching call');
  });
});
