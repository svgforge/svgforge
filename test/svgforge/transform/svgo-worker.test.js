import assert from 'node:assert/strict';
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import {optimize as realOptimize} from 'svgo';
import svgoTransform from '../../../lib/svgforge/transform/svgo.js';
import {isSerializable, optimizeInWorker, terminateWorkers} from '../../../lib/svgforge/transform/svgo-pool.js';
import {dependencyKeys, setDependency, resetDependencies} from '../../../lib/deps.js';

const TEST_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';

// The exact config svgoTransform assembles for default settings with
// xmlDeclaration/doctypeDeclaration disabled.
const DEFAULT_CONFIG = {
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
};

const createSpriter = () => ({
  config: {
    svg: {
      xmlDeclaration: false,
      doctypeDeclaration: false,
    },
    log: {
      transports: [],
    },
  },
  error: mock.fn(),
  debug: mock.fn(),
});

const createShape = () => ({
  name: 'shape',
  setSVG: mock.fn(),
  getSVG: mock.fn(() => (TEST_SVG)),
});

const runTransform = (shape, config, spriter) => new Promise(resolve => {
  svgoTransform(shape, config, spriter, resolve);
});

afterEach(async () => {
  resetDependencies();
  await terminateWorkers();
});

describe('testing isSerializable', () => {
  it('should accept plain objects, arrays and primitives', () => {
    assert.strictEqual(isSerializable({plugins: [{name: 'preset-default', params: {overrides: {a: false}}}]}), true);
    assert.strictEqual(isSerializable(['a', 1, null]), true);
    assert.strictEqual(isSerializable('string'), true);
    assert.strictEqual(isSerializable(42), true);
    assert.strictEqual(isSerializable(undefined), true);
  });

  it('should reject functions, symbols and class instances', () => {
    const customPlugin = () => {};
    assert.strictEqual(isSerializable(customPlugin), false);
    assert.strictEqual(isSerializable({fn: customPlugin}), false);
    assert.strictEqual(isSerializable(Symbol('x')), false);
    assert.strictEqual(isSerializable(new Date()), false);
    assert.strictEqual(isSerializable(/regex/u), false);
  });

  it('should accept cyclic plain objects', () => {
    const cyclic = {nested: {}};
    cyclic.nested.self = cyclic;
    assert.strictEqual(isSerializable(cyclic), true);
  });
});

describe('testing svgoTransform with the worker pool', () => {
  it('should dispatch optimization to a worker and apply the result', async () => {
    const workerOptimize = mock.fn(optimizeInWorker);
    setDependency(dependencyKeys.svgoPoolOptimize, workerOptimize);
    const shape = createShape();
    const spriter = createSpriter();

    const error = await runTransform(shape, {}, spriter);

    assert.strictEqual(error, null);
    assert.strictEqual(workerOptimize.mock.callCount(), 1);
    assert.ok(workerOptimize.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG, DEFAULT_CONFIG])), 'expected a matching call');
    assert.ok(shape.setSVG.mock.calls.some(call => isDeepStrictEqual(call.arguments, [realOptimize(TEST_SVG, DEFAULT_CONFIG).data])), 'expected a matching call');
  });

  it('should fall back to the main thread when the optimizer is replaced', () => {
    const mockOptimize = mock.fn(() => ({data: 'optimized'}));
    setDependency(dependencyKeys.svgoOptimize, mockOptimize);
    const workerOptimize = mock.fn();
    setDependency(dependencyKeys.svgoPoolOptimize, workerOptimize);
    const shape = createShape();
    const spriter = createSpriter();
    const callback = mock.fn();

    svgoTransform(shape, {}, spriter, callback);

    assert.ok(mockOptimize.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG, DEFAULT_CONFIG])), 'expected a matching call');
    assert.strictEqual(workerOptimize.mock.callCount(), 0);
    assert.ok(shape.setSVG.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['optimized'])), 'expected a matching call');
    assert.ok(callback.mock.calls.some(call => isDeepStrictEqual(call.arguments, [null])), 'expected a matching call');
  });

  it('should fall back to the main thread for non-serializable configs', async () => {
    const workerOptimize = mock.fn();
    setDependency(dependencyKeys.svgoPoolOptimize, workerOptimize);
    const shape = createShape();
    const spriter = createSpriter();

    const error = await runTransform(shape, {extra: () => 'ignored'}, spriter);

    // SVGO ignores unknown config keys, so the in-process optimization runs
    // fine — it just must not be handed to a worker.
    assert.strictEqual(error, null);
    assert.strictEqual(workerOptimize.mock.callCount(), 0);
    assert.ok(shape.setSVG.mock.calls.some(call => isDeepStrictEqual(call.arguments, [realOptimize(TEST_SVG, DEFAULT_CONFIG).data])), 'expected a matching call');
  });

  it('should report worker failures through the callback', async () => {
    const TEST_ERROR = new Error('worker boom');
    const workerOptimize = mock.fn(() => (Promise.reject(TEST_ERROR)));
    setDependency(dependencyKeys.svgoPoolOptimize, workerOptimize);
    const shape = createShape();
    const spriter = createSpriter();

    const error = await runTransform(shape, {}, spriter);

    assert.strictEqual(error, TEST_ERROR);
    assert.ok(spriter.error.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Optimizing "%s" with SVGO failed with error "%s"', 'shape', TEST_ERROR])), 'expected a matching call');
  });
});

describe('testing the real SVGO worker', () => {
  it('should optimize an SVG on a worker identically to the main thread', async () => {
    const workerResult = await optimizeInWorker(TEST_SVG, DEFAULT_CONFIG);
    assert.strictEqual(workerResult.data, realOptimize(TEST_SVG, DEFAULT_CONFIG).data);
  });
});
